#define BLYNK_TEMPLATE_ID "TMPL2PtoVk3w"
#define BLYNK_TEMPLATE_NAME "AquaSence"
#define BLYNK_AUTH_TOKEN "PWvh6wt4aTYRgkgt_uZD98fNM7CMfb34"

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <BlynkSimpleEsp32.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

float tempGlobal  = 0;
float phGlobal    = 0;
float turbGlobal  = 0;
float oxGlobal    = 0;
bool  datosListos = false;

// Hilo para enviar datos a la API sin bloquear
void tareaEnvio(void* param) {
  while (true) {
    if (datosListos && WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.setTimeout(2000);

      auto enviar = [&](int sensor, float valor) {
        StaticJsonDocument<200> doc;
        doc["sensor"] = sensor;
        doc["valor"]  = valor;
        String body;
        serializeJson(doc, body);
        http.begin("http://192.168.0.9:5000/sendDato");
        http.addHeader("Content-Type", "application/json");
        http.POST(body);
        http.end();
      };

      enviar(2, tempGlobal);
      enviar(1, phGlobal);
      enviar(3, turbGlobal);
      enviar(4, oxGlobal);

      // Enviar a Blynk
      Blynk.virtualWrite(V0, tempGlobal);
      Blynk.virtualWrite(V1, phGlobal);
      Blynk.virtualWrite(V2, oxGlobal);
      Blynk.virtualWrite(V3, turbGlobal);

      datosListos = false;
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  sensors.begin();

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Iniciando...");
  delay(2000);
  lcd.clear();

  WiFiManager wm;
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");

  bool res = wm.autoConnect("ESP32_Config");

  if (!res) {
    lcd.clear();
    lcd.print("WiFi fallido");
    delay(3000);
    ESP.restart();
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi OK!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
  lcd.clear();

  // Conectar a Blynk
  Blynk.config(BLYNK_AUTH_TOKEN);
  Blynk.connect();

  xTaskCreate(tareaEnvio, "EnvioAPI", 8192, NULL, 1, NULL);
}

void loop() {
  static unsigned long lastSend = 0;

  Blynk.run();

  sensors.requestTemperatures();
  float temperatura = sensors.getTempCByIndex(0);

  float ph       = random(65, 85) / 10.0;
  float turbidez = random(1, 10);
  float oxigeno  = random(50, 100) / 10.0;

  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  if (temperatura == DEVICE_DISCONNECTED_C) {
    lcd.print("Error   ");
  } else {
    lcd.print(temperatura);
    lcd.print(" C   ");
  }

  lcd.setCursor(0, 1);
  lcd.print("pH:");
  lcd.print(ph);
  lcd.print(" O2:");
  lcd.print(oxigeno);

  Serial.print("Temp: "); Serial.println(temperatura);

  if (millis() - lastSend >= 5000) {
    lastSend   = millis();
    tempGlobal = temperatura;
    phGlobal   = ph;
    turbGlobal = turbidez;
    oxGlobal   = oxigeno;
    datosListos = true;
  }

  delay(2000);
}