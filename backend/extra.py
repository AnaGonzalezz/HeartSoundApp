import tensorflow as tf
model = tf.keras.models.load_model("final_model.h5", compile=False)
model.summary()