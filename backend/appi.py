'''
pip install Flask
pip install Flask-MySQLdb
pip install Flask-Cors
'''

from flask import Flask, request, jsonify, send_from_directory
from flask_mysqldb import MySQL
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración MySQL desde .env
app.config['MYSQL_HOST'] = os.getenv('MYSQL_ADDON_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('MYSQL_ADDON_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_ADDON_PASSWORD', '')
app.config['MYSQL_DB'] = os.getenv('MYSQL_ADDON_DB', 'esp32')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_ADDON_PORT', 3306))

mysql = MySQL(app)

# -----------------------------
# SERVIR ARCHIVOS HTML/CSS/JS
# -----------------------------
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BACKEND_DIR), 'frontend')

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    """Servir archivos HTML del frontend"""
    if filename.endswith('.html'):
        return send_from_directory(FRONTEND_DIR, filename)
    return send_from_directory(FRONTEND_DIR, filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Servir archivos CSS"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Servir archivos JavaScript"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route('/img/<path:filename>')
def serve_img(filename):
    """Servir imágenes"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'img'), filename)


# -----------------------------
# GUARDAR MEDICION
# -----------------------------
@app.route('/sendDato', methods=['POST'])
def sendDato():
    sensor = request.json['sensor']
    valor = float(request.json['valor'])

    cursor = mysql.connection.cursor()
    cursor.execute("""
        INSERT INTO medicion (id_sensor, valor, fecha_hora)
        VALUES (%s,%s,NOW())
    """,(sensor, valor))
    mysql.connection.commit()

    mensaje = None
    if sensor == 1 and (valor < 6.5 or valor > 8.5):
        mensaje = "Alerta: pH fuera de rango"
    elif sensor == 2 and (valor < 20 or valor > 30):
        mensaje = "Alerta: temperatura fuera de rango"
    elif sensor == 3 and valor > 5:
        mensaje = "Alerta: turbidez alta"
    elif sensor == 4 and valor < 5:
        mensaje = "Alerta: oxígeno bajo"

    if mensaje:
        cursor.execute("""
        INSERT INTO alerta (mensaje,estado,fecha_hora)
        VALUES (%s,'activa',NOW())
        """,(mensaje,))
        mysql.connection.commit()

    return jsonify({"mensaje": "dato guardado"})


# -----------------------------
# OBTENER MEDICIONES
# -----------------------------
@app.route('/getDatos', methods=['GET'])
def getDatos():
    cursor = mysql.connection.cursor()
    cursor.execute("""
    SELECT sensor.tipo_sensor, medicion.valor, medicion.fecha_hora
    FROM medicion
    JOIN sensor ON medicion.id_sensor = sensor.id_sensor
    ORDER BY medicion.fecha_hora DESC
    """)
    data = cursor.fetchall()
    return jsonify(data)


# -----------------------------
# OBTENER ALERTAS
# -----------------------------
@app.route('/getAlertas', methods=['GET'])
def getAlertas():
    cursor = mysql.connection.cursor()
    cursor.execute("""
    SELECT mensaje, fecha_hora
    FROM alerta
    WHERE estado='activa'
    """)
    data = cursor.fetchall()
    return jsonify(data)


# -----------------------------
# GENERAR REPORTE
# -----------------------------
@app.route('/generarReporte', methods=['POST'])
def generarReporte():
    cursor = mysql.connection.cursor()
    cursor.execute("""
    INSERT INTO informes (fecha_generada, tipo_reporte)
    VALUES (NOW(), 'calidad del agua')
    """)
    mysql.connection.commit()
    return jsonify({"mensaje": "reporte generado"})


# -----------------------------
# LOGIN
# -----------------------------
@app.route('/login', methods=['POST'])
def login():
    correo    = request.json.get('correo', '')
    contrasena = request.json.get('contrasena', '')

    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT id_usuario, nombre_completo, correo_usuario, id_rol
        FROM usuario
        WHERE correo_usuario = %s AND contrasena = %s
    """, (correo, contrasena))

    user = cursor.fetchone()

    if user:
        return jsonify({
            "ok": True,
            "usuario": {
                "id":     user[0],
                "nombre": user[1],
                "correo": user[2],
                "rol":    user[3]
            }
        })
    else:
        return jsonify({"ok": False})


# -----------------------------
# REGISTRO
# -----------------------------
@app.route('/registro', methods=['POST'])
def registro():
    nombre    = request.json.get('nombre', '')
    correo    = request.json.get('correo', '')
    contrasena = request.json.get('contrasena', '')

    if not nombre or not correo or not contrasena:
        return jsonify({"ok": False, "mensaje": "Faltan datos"})

    cursor = mysql.connection.cursor()

    # Verificar si el correo ya existe
    cursor.execute("SELECT id_usuario FROM usuario WHERE correo_usuario = %s", (correo,))
    if cursor.fetchone():
        return jsonify({"ok": False, "mensaje": "El correo ya está registrado"})

    cursor.execute("""
        INSERT INTO usuario (nombre_completo, correo_usuario, contrasena, id_rol)
        VALUES (%s, %s, %s, 1)
    """, (nombre, correo, contrasena))
    mysql.connection.commit()

    return jsonify({"ok": True})


# -----------------------------
# EJECUTAR API
# -----------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)