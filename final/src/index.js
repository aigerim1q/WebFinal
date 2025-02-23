import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import qr from "qr-image";
import fs from "fs";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import axios from "axios";
import { UserCollection, BlogCollection } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Используем встроенные middleware для JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// Routes

app.get("/", (req, res) => res.redirect("/login"));

app.get("/signup", (req, res) => res.render("signup"));

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await UserCollection.findOne({ name: username });
  if (existingUser) return res.send("User already exists. Please choose another username.");

  const hashedPassword = await bcrypt.hash(password, 10);
  await UserCollection.create({ name: username, password: hashedPassword });
  console.log("User registered:", username);
  res.redirect("/login");
});

app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserCollection.findOne({ name: username });
    if (!user) return res.send("Username not found");

    const isMatch = await bcrypt.compare(password, user.password);
    isMatch ? res.redirect("/home") : res.send("Wrong password");
  } catch {
    res.send("Invalid Details");
  }
});

app.get("/home", (req, res) => res.render("home"));

app.get("/bmi", (req, res) => res.render("bmi", { bmi: null, category: null }));

app.post("/calculate-bmi", (req, res) => {
  const weight = parseFloat(req.body.weight);
  const height = parseFloat(req.body.height);
  if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0)
    return res.render("bmi", { bmi: "Invalid input", category: "Please enter positive numbers." });
  const bmi = weight / (height * height);
  let category = bmi < 18.5 ? "Underweight"
              : bmi < 24.9 ? "Normal weight"
              : bmi < 29.9 ? "Overweight" : "Obese";
  res.render("bmi", { bmi: bmi.toFixed(2), category });
});

app.get("/qr", (req, res) => res.render("qr", { qrImage: null }));

app.post("/generate-qr", (req, res) => {
  const { url } = req.body;
  if (!url) return res.render("qr", { qrImage: null });
  const qrBase64 = qr.imageSync(url, { type: "png" }).toString("base64");
  res.render("qr", { qrImage: qrBase64 });
});

app.get("/nodemailer", (req, res) => res.render("nodemailer", { message: null }));

app.post("/send-email", async (req, res) => {
  const { recipient, subject, message } = req.body;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "230434@astanait.edu.kz",
      pass: "9CPOADq6HGXDn",
    },
  });
  const mailOptions = { from: "230434@astanait.edu.kz", to: recipient, subject, text: message };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    res.render("nodemailer", { message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.render("nodemailer", { message: "Error sending email. Please try again." });
  }
});

// CRUD Blog Routes
app.get("/crud", (req, res) => res.render("crud"));

app.post("/blogs", async (req, res) => res.json(await BlogCollection.create(req.body)));
app.get("/blogs", async (req, res) => res.json(await BlogCollection.find()));
app.get("/blogs/:id", async (req, res) => res.json(await BlogCollection.findById(req.params.id) || { error: "Blog not found" }));
app.put("/blogs/:id", async (req, res) => res.json(await BlogCollection.findByIdAndUpdate(req.params.id, req.body, { new: true }) || { error: "Blog not found" }));
app.delete("/blogs/:id", async (req, res) => res.json(await BlogCollection.findByIdAndDelete(req.params.id) || { error: "Blog not found" }));

app.get("/weather", (req, res) => res.render("weather", { weatherData: null }));

const COVID_API_URL = "https://disease.sh/v3/covid-19";
const CURRENCY_API_KEY = "e5cba343187ac09d24372911";

app.get("/weather-data", async (req, res) => {
    const place = req.query.place || "Unknown";
    const baseCurrency = req.query.baseCurrency || "USD";
    const targetCurrency = req.query.targetCurrency || "EUR";
    const openWeatherApiKey = "62cd3dd6b4b3782fbe2cd03837b17264";
    const weatherApiKey = "74649c0d1c4840d99a9173513251501";
    const weatherbitApiKey = "439314b0636a43d4be0b662b4243e1e4";
  
    const openWeatherAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${place}&units=metric&appid=${openWeatherApiKey}`;
    const weatherAPIUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${place}`;
  
    try {
      // Получаем данные погоды
      const weatherResponse = await fetch(openWeatherAPIUrl);
      if (!weatherResponse.ok) throw new Error("City not found or OpenWeather API error");
      const weatherData = await weatherResponse.json();
  
      // Получаем локальное время и другие данные с WeatherAPI
      const timeResponse = await fetch(weatherAPIUrl);
      if (!timeResponse.ok) throw new Error("City not found or WeatherAPI error");
      const timeData = await timeResponse.json();
  
      // Получаем данные о качестве воздуха через Weatherbit API
      const { lat, lon } = weatherData.coord;
      const weatherbitAPIUrl = `https://api.weatherbit.io/v2.0/current/airquality?lat=${lat}&lon=${lon}&key=${weatherbitApiKey}`;
      const airQualityResponse = await fetch(weatherbitAPIUrl);
      if (!airQualityResponse.ok) throw new Error("Air Quality data not available");
      const airQualityData = await airQualityResponse.json();
  
      // Получаем иконку погоды
      const iconUrl = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
  
      // Получаем данные по COVID-19 для страны (используем код страны из погоды)
      const country = weatherData.sys.country; // обычно ISO-код, который disease.sh принимает
      const covidResponse = await axios.get(`${COVID_API_URL}/countries/${country}`);
      const { cases, deaths, recovered } = covidResponse.data;
  
      // Получаем данные по валютному курсу
      const currencyResponse = await axios.get(`https://v6.exchangerate-api.com/v6/${CURRENCY_API_KEY}/latest/${baseCurrency}`);
      const exchangeRate = currencyResponse.data.conversion_rates[targetCurrency];
  
      // Отправляем объединённый ответ
      res.json({
        place: place.toUpperCase(),
        temperature: weatherData.main.temp,
        feels_like: weatherData.main.feels_like,
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        wind_speed: weatherData.wind.speed,
        country: weatherData.sys.country,
        rain: weatherData.rain ? weatherData.rain["3h"] : "No data",
        local_time: timeData.location.localtime,
        air_quality: {
          pm25: airQualityData.data[0].pm25,
          pm10: airQualityData.data[0].pm10,
          o3: airQualityData.data[0].o3,
          no2: airQualityData.data[0].no2,
          so2: airQualityData.data[0].so2,
          co: airQualityData.data[0].co,
        },
        icon_url: iconUrl,
        coordinates: { lat, lon },
        covid: {
          cases,
          deaths,
          recovered,
        },
        currency: {
          base: baseCurrency,
          target: targetCurrency,
          exchangeRate,
        },
      });
    } catch (error) {
      res.json({ error: error.message });
    }
  });

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
