import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# ==========================================================
# CONFIGURACIÓN INICIAL analisis_metricas.py
# ==========================================================

#ARCHIVO PARA ANALIzAR LOS REGISTROS EN metrics_log.csv que se hacen cada que se analiza una grabación real, se guardan las metricas  metrics["snr"],
#            metrics["dynamic_range"],
#           metrics["noise_before"],
#          metrics["noise_after"],
#           metrics["thd"],
#El csv tiene las columnas:
#timestamp,filename,snr,dynamic_range,noise_before,noise_after,thd,prediction

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.join(BASE_DIR, "metrics_log.csv")
GRAPHS_DIR = os.path.join(BASE_DIR, "graphs")

# Crear carpeta graphs si no existe
os.makedirs(GRAPHS_DIR, exist_ok=True)

sns.set(style="whitegrid")


# ==========================================================
# CARGAR CSV
# ==========================================================
if not os.path.exists(CSV_PATH):
    print(f"No existe el archivo {CSV_PATH}")
    print("Asegúrate de que el backend ya haya registrado métricas.")
    exit()

df = pd.read_csv(CSV_PATH)

if len(df) == 0:
    print(" El archivo metrics_log.csv está vacío.")
    exit()

print(f" Registros cargados: {len(df)}")
print(df.head())


# ==========================================================
# LISTA DE MÉTRICAS
# ==========================================================
metrics = ["snr", "dynamic_range", "noise_before", "noise_after", "thd"]

# ==========================================================
# 1. HISTOGRAMAS
# ==========================================================
print(" Generando histogramas...")

for m in metrics:
    plt.figure(figsize=(6,4))
    sns.histplot(df[m], kde=True)
    plt.title(f"Distribución de {m}")
    plt.xlabel(m)
    plt.ylabel("Frecuencia")
    plt.tight_layout()
    plt.savefig(os.path.join(GRAPHS_DIR, f"hist_{m}.png"))
    plt.close()

# ==========================================================
# 2. BOXPLOTS POR CLASE PREDICHA
# ==========================================================
if "prediction" in df.columns:
    print(" Generando boxplots por clase...")

    for m in metrics:
        plt.figure(figsize=(7,4))
        sns.boxplot(data=df, x="prediction", y=m)
        plt.title(f"{m} por clase predicha")
        plt.tight_layout()
        plt.savefig(os.path.join(GRAPHS_DIR, f"box_{m}.png"))
        plt.close()

# ==========================================================
# 3. MATRIZ DE CORRELACIÓN
# ==========================================================
print(" Generando matriz de correlación...")

plt.figure(figsize=(8,6))
sns.heatmap(df[metrics].corr(), annot=True, cmap="coolwarm", square=True)
plt.title("Matriz de correlación entre métricas")
plt.tight_layout()
plt.savefig(os.path.join(GRAPHS_DIR, "correlacion_metricas.png"))
plt.close()

# ==========================================================
# 4. SNR vs THD
# ==========================================================
print(" Gráfica SNR vs THD...")

plt.figure(figsize=(7,5))
sns.scatterplot(data=df, x="snr", y="thd", hue=df["prediction"] if "prediction" in df else None)
plt.title("SNR vs THD (Ruido vs Distorsión)")
plt.tight_layout()
plt.savefig(os.path.join(GRAPHS_DIR, "snr_vs_thd.png"))
plt.close()

# ==========================================================
# 5. Ruido Antes vs Después (efecto del filtrado)
# ==========================================================
print("Gráfica ruido antes/después del filtrado...")

plt.figure(figsize=(7,5))
sns.scatterplot(
    data=df,
    x="noise_before",
    y="noise_after",
    hue=df["prediction"] if "prediction" in df else None
)
plt.title("Ruido antes vs después del filtrado")
plt.tight_layout()
plt.savefig(os.path.join(GRAPHS_DIR, "noise_before_after.png"))
plt.close()

# ==========================================================
# 6. THD en el tiempo (orden cronológico)
# ==========================================================
if "timestamp" in df.columns:
    print(" Gráfica THD vs tiempo...")

    df_sorted = df.sort_values("timestamp")

    plt.figure(figsize=(10,4))
    plt.plot(df_sorted["thd"], marker="o")
    plt.title("THD a lo largo del tiempo")
    plt.ylabel("THD")
    plt.xlabel("Grabación número")
    plt.tight_layout()
    plt.savefig(os.path.join(GRAPHS_DIR, "thd_tiempo.png"))
    plt.close()

# ==========================================================
# 7. Pairplot (análisis multivariado)
# ==========================================================
if "prediction" in df.columns:
    print("Generando pairplot (puede tardar)...")

    sns.pairplot(
        df[["snr","dynamic_range","noise_before","noise_after","thd","prediction"]],
        hue="prediction"
    )
    plt.savefig(os.path.join(GRAPHS_DIR, "pairplot.png"))
    plt.close()

print(" Todas las gráficas fueron generadas en la carpeta /graphs")