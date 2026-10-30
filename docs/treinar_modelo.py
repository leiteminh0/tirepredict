"""Script de treinamento do modelo TirePredict.

Gera um dataset sintético com base nas especificações técnicas de pneus
agrícolas, treina um Random Forest e salva o artefato em backend/modelo_pneu.pkl.

Uso:
    cd tirepredict
    pip install scikit-learn==1.4.2 joblib numpy
    python docs/treinar_modelo.py

Saída:
    backend/modelo_pneu.pkl  — artefato atualizado
    SHA-256 impresso no terminal — atualizar em backend/predicao.py
"""

import hashlib
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

# ── Semente global ─────────────────────────────────────────────────────────────
RNG = np.random.default_rng(42)

# ── Parâmetros do dataset ─────────────────────────────────────────────────────
N_POR_CLASSE = 1_200  # 3 600 amostras no total, balanceado

# Intervalos centrais por classe (pressão PSI, temperatura °C, horas_uso h)
# Baseados em: manuais JD 6110J, Case IH 6150, normas ETRTO/TRA
_CLASSES = {
    "BAIXO": {"pressao": (28, 42), "temperatura": (20, 50), "horas_uso": (0, 1_200)},
    "MEDIO": {"pressao": (22, 28), "temperatura": (50, 65), "horas_uso": (1_200, 2_000)},
    "ALTO":  {"pressao": (10, 22), "temperatura": (65, 95), "horas_uso": (2_000, 5_000)},
}

# Ruído gaussiano para evitar fronteiras artificialmente perfeitas
_RUIDO = {"pressao": 1.5, "temperatura": 2.0, "horas_uso": 30.0}


def _gerar_amostras(nome_classe: str, cfg: dict, n: int) -> tuple[np.ndarray, np.ndarray]:
    def unif(lo, hi):
        return RNG.uniform(lo, hi, n)

    def ruido(sigma):
        return RNG.normal(0, sigma, n)

    pressao = np.clip(unif(*cfg["pressao"]) + ruido(_RUIDO["pressao"]), 0, 250)
    temperatura = np.clip(unif(*cfg["temperatura"]) + ruido(_RUIDO["temperatura"]), -80, 200)
    horas_uso = np.clip(unif(*cfg["horas_uso"]) + ruido(_RUIDO["horas_uso"]), 0, 200_000)

    X = np.column_stack([pressao, temperatura, horas_uso])
    y = np.full(n, nome_classe)
    return X, y


def gerar_dataset() -> tuple[np.ndarray, np.ndarray]:
    partes_X, partes_y = [], []
    for nome, cfg in _CLASSES.items():
        X, y = _gerar_amostras(nome, cfg, N_POR_CLASSE)
        partes_X.append(X)
        partes_y.append(y)
    X = np.vstack(partes_X)
    y = np.concatenate(partes_y)

    # Embaralha para que treino/teste não fiquem por classe
    idx = RNG.permutation(len(X))
    return X[idx], y[idx]


def treinar(X_train, y_train) -> RandomForestClassifier:
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=4,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    return clf


def avaliar(clf: RandomForestClassifier, X_test, y_test) -> None:
    y_pred = clf.predict(X_test)
    acc = (y_pred == y_test).mean()
    print(f"\n{'='*60}")
    print(f"  Acurácia no conjunto de teste: {acc:.1%}")
    print(f"{'='*60}")
    print(classification_report(y_test, y_pred, target_names=["ALTO", "BAIXO", "MEDIO"]))
    print("Matriz de confusão:")
    print(confusion_matrix(y_test, y_pred, labels=["BAIXO", "MEDIO", "ALTO"]))

    importancias = clf.feature_importances_
    features = ["pressao", "temperatura", "horas_uso"]
    print("\nImportância das features (Gini):")
    for f, imp in sorted(zip(features, importancias), key=lambda x: -x[1]):
        print(f"  {f:<12}: {imp:.4f}")


def salvar(clf: RandomForestClassifier, destino: Path) -> str:
    destino.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, destino)
    sha = hashlib.sha256(destino.read_bytes()).hexdigest()
    print(f"\nArtefato salvo em: {destino}")
    print(f"SHA-256: {sha}")
    print(
        "\n⚠️  Atualize _MODELO_SHA256_ESPERADO em backend/predicao.py com o valor acima."
    )
    return sha


def main() -> None:
    saida = Path(__file__).resolve().parents[1] / "backend" / "modelo_pneu.pkl"

    print("Gerando dataset sintético…")
    X, y = gerar_dataset()
    print(f"  {len(X)} amostras geradas  |  classes: {np.unique(y, return_counts=True)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"  Treino: {len(X_train)}  |  Teste: {len(X_test)}")

    print("\nTreinando Random Forest…")
    clf = treinar(X_train, y_train)
    print("  Treinamento concluído.")

    avaliar(clf, X_test, y_test)
    salvar(clf, saida)


if __name__ == "__main__":
    try:
        import sklearn  # noqa: F401
    except ImportError:
        sys.exit("Instale as dependências: pip install scikit-learn==1.4.2 joblib numpy")
    main()
