import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory, session
import mysql.connector
from flask_cors import CORS
 
load_dotenv()
 
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecret123")
 
CORS(app, supports_credentials=True, origins=[
    "https://spontaneous-duckanoo-37b764.netlify.app",
    "http://localhost:5000",
    "http://localhost:8080",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:8080"
])
 
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BACKEND_DIR), 'frontend')
 
def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_ADDON_HOST", "localhost"),
        port=int(os.getenv("MYSQL_ADDON_PORT", 3306)),
        user=os.getenv("MYSQL_ADDON_USER", "root"),
        password=os.getenv("MYSQL_ADDON_PASSWORD", ""),
        database=os.getenv("MYSQL_ADDON_DB", "esp32")
    )
 
medir = False
 
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'login.html')
 
@app.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)
 
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)
 
@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)
 
@app.route('/img/<path:filename>')
def serve_img(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'img'), filename)
 
@app.route('/login', methods=['POST'])
def login():
    correo = request.json.get('correo', '')
    contrasena = request.json.get('contrasena', '')
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_usuario, nombre_completo, correo_usuario, id_rol
        FROM usuario WHERE correo_usuario=%s AND contrasena=%s
    """, (correo, contrasena))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if user:
        return jsonify({"ok": True, "usuario": {"id": user[0], "nombre": user[1], "correo": user[2], "rol": user[3]}})
    return jsonify({"ok": False})
 
@app.route('/registro', methods=['POST'])
def registro():
    nombre = request.json.get('nombre', '')
    correo = request.json.get('correo', '')
    contrasena = request.json.get('contrasena', '')
    if not nombre or not correo or not contrasena:
        return jsonify({"ok": False, "mensaje": "Faltan datos"})
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id_usuario FROM usuario WHERE correo_usuario=%s", (correo,))
    if cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({"ok": False, "mensaje": "El correo ya está registrado"})
    cursor.execute("""
        INSERT INTO usuario (nombre_completo, correo_usuario, contrasena, id_rol)
        VALUES (%s, %s, %s, 1)
    """, (nombre, correo, contrasena))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"ok": True})
 
@app.route('/iniciarMedicion', methods=['GET'])
def iniciarMedicion():
    global medir
    medir = True
    return jsonify({"mensaje": "Medición iniciada"})
 
@app.route('/estadoMedicion', methods=['GET'])
def estadoMedicion():
    global medir
    if medir:
        medir = False
        return jsonify({"medir": True})
    return jsonify({"medir": False})
 
@app.route('/sendDato', methods=['POST'])
def sendDato():
    sensor = request.json['sensor']
    valor = float(request.json['valor'])
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO medicion (id_sensor, valor, fecha_hora) VALUES (%s,%s,NOW())", (sensor, valor))
    conn.commit()
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
        cursor.execute("INSERT INTO alerta (mensaje,estado,fecha_hora) VALUES (%s,'activa',NOW())", (mensaje,))
        conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensaje": "dato guardado"})
 
@app.route('/getDatos', methods=['GET'])
def getDatos():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT sensor.tipo_sensor, medicion.valor, medicion.fecha_hora
        FROM medicion JOIN sensor ON medicion.id_sensor = sensor.id_sensor
        ORDER BY medicion.fecha_hora DESC
    """)
    data = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(data)
 
@app.route('/getAlertas', methods=['GET'])
def getAlertas():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT mensaje, fecha_hora FROM alerta WHERE estado='activa'")
    data = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(data)
 
@app.route('/generarReporte', methods=['POST'])
def generarReporte():
    id_usuario = None
    usuario_texto = 'Usuario'
    if request.is_json:
        id_usuario = request.json.get('id_usuario')
        usuario_texto = request.json.get('usuario', 'Usuario')
 
    conn = get_connection()
    cursor = conn.cursor()
 
    # Si viene id_usuario, buscamos su nombre real en la BD y lo usamos
    # como generado_por (más confiable que confiar en lo que mande el frontend)
    if id_usuario:
        cursor.execute("SELECT nombre_completo FROM usuario WHERE id_usuario=%s", (id_usuario,))
        row = cursor.fetchone()
        if row:
            usuario_texto = row[0]
 
    cursor.execute(
        "INSERT INTO informes (fecha_generada, tipo_reporte, generado_por, id_usuario) VALUES (NOW(), 'calidad del agua', %s, %s)",
        (usuario_texto, id_usuario)
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensaje": "reporte generado"})
 
@app.route('/getReportes', methods=['GET'])
def getReportes():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_reporte, fecha_generada, tipo_reporte, generado_por
        FROM informes
        ORDER BY fecha_generada DESC
    """)
    data = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(data)
 
@app.route('/getSensores', methods=['GET'])
def getSensores():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id_sensor, tipo_sensor, unidad_medida FROM sensor")
    data = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(data)
 
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)