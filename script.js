// Элементы интерфейса
const weatherContainer = document.getElementById("weather-container");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const refreshBtn = document.getElementById("refresh-btn");
const locationTitle = document.getElementById("location-title");
const geoBtn = document.getElementById("geo-btn");

const cityInput = document.getElementById("city-input");
const addCityBtn = document.getElementById("add-city-btn");
const suggestions = document.getElementById("suggestions");
const citiesList = document.getElementById("cities-list");
const cityError = document.getElementById("city-error");
const emptyCitiesMessage = document.getElementById("empty-cities-message");
const geoToast = document.getElementById("geo-toast");

// Доступные города
const availableCities = [
    { name: "Москва", lat: 55.7558, lon: 37.6176 },
    { name: "Санкт-Петербург", lat: 59.9343, lon: 30.3351 },
    { name: "Новосибирск", lat: 55.0084, lon: 82.9357 },
    { name: "Екатеринбург", lat: 56.8389, lon: 60.6057 },
    { name: "Казань", lat: 55.7942, lon: 49.1115 }
];

// Сохраненные данные
let storedData = JSON.parse(localStorage.getItem("weatherApp")) || {
    main: null,
    cities: []
};

// Инициализация при загрузке страницы
window.addEventListener("DOMContentLoaded", function() {
    // Прячем загрузку сразу
    hideLoading();
    
    if (!storedData.main) {
        requestGeolocation();
    } else {
        loadAllWeather();
    }
    
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    refreshBtn.addEventListener("click", function() {
        loadAllWeather();
    });
    
    geoBtn.addEventListener("click", function() {
        requestGeolocation();
    });
    
    addCityBtn.addEventListener("click", function() {
        addCity();
    });
    
    cityInput.addEventListener("input", function() {
        showSuggestions();
    });
    
    cityInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            addCity();
        }
    });
    
    // Закрытие подсказок при клике вне
    document.addEventListener("click", function(e) {
        if (!e.target.closest("#city-input") && !e.target.closest("#suggestions")) {
            suggestions.classList.add("hidden");
        }
    });
}

// Запрос геолокации
function requestGeolocation() {
    showToast("Определение местоположения...");
    
    if (!navigator.geolocation) {
        showToast("Ваш браузер не поддерживает геолокацию");
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            storedData.main = {
                name: "Текущее местоположение",
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            
            saveData();
            showToast("Местоположение определено!");
            loadAllWeather();
        },
        function(error) {
            let message = "";
            
            if (error.code === error.PERMISSION_DENIED) {
                message = "Доступ к геолокации отклонён. Введите город вручную.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = "Не удалось определить местоположение.";
            } else if (error.code === error.TIMEOUT) {
                message = "Время ожидания истекло.";
            } else {
                message = "Произошла ошибка.";
            }
            
            showToast(message);
            
            // Фокус на поле ввода, если нет сохраненных городов
            if (storedData.cities.length === 0) {
                cityInput.focus();
            }
        }
    );
}

// Загрузка всей погоды
function loadAllWeather() {
    hideError();
    showLoading();
    
    // Загружаем основное местоположение
    if (storedData.main) {
        loadWeather(storedData.main);
        locationTitle.textContent = storedData.main.name;
    } else {
        // Если нет основного города, сразу скрываем загрузку
        hideLoading();
    }
    
    // Обновляем список городов
    renderCitiesList();
}

// Загрузка погоды для города
function loadWeather(city) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`;
    
    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.daily) {
                renderWeather(city.name, data.daily);
            } else {
                showError("Ошибка данных");
            }
            hideLoading();
        })
        .catch(function(error) {
            showError("Ошибка загрузки данных о погоде");
            hideLoading();
        });
}

// Отображение погоды
function renderWeather(cityName, daily) {
    // Очищаем контейнер
    weatherContainer.innerHTML = "";
    
    // Если нет данных, показываем сообщение
    if (!daily || !daily.time || daily.time.length === 0) {
        const message = document.createElement("div");
        message.className = "error";
        message.textContent = "Нет данных о погоде";
        weatherContainer.appendChild(message);
        return;
    }
    
    // Создаем элементы для каждого дня
    for (let i = 0; i < daily.time.length; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "forecast-day";
        
        // Заголовок дня
        const dayTitle = document.createElement("h3");
        if (i === 0) {
            dayTitle.textContent = "Сегодня";
        } else if (i === 1) {
            dayTitle.textContent = "Завтра";
        } else {
            dayTitle.textContent = "День " + (i + 1);
        }
        
        // Температура макс
        const tempMax = document.createElement("div");
        tempMax.className = "temp-max";
        tempMax.textContent = "Макс: " + daily.temperature_2m_max[i] + "°C";
        
        // Температура мин
        const tempMin = document.createElement("div");
        tempMin.className = "temp-min";
        tempMin.textContent = "Мин: " + daily.temperature_2m_min[i] + "°C";
        
        // Добавляем все в день
        dayDiv.appendChild(dayTitle);
        dayDiv.appendChild(tempMax);
        dayDiv.appendChild(tempMin);
        
        // Добавляем день в контейнер
        weatherContainer.appendChild(dayDiv);
    }
}

// Добавление города
function addCity() {
    const name = cityInput.value.trim();
    
    // Проверяем пустое поле
    if (!name) {
        showCityError("Введите название города");
        return;
    }
    
    // Ищем город в списке
    let foundCity = null;
    for (let i = 0; i < availableCities.length; i++) {
        if (availableCities[i].name.toLowerCase() === name.toLowerCase()) {
            foundCity = availableCities[i];
            break;
        }
    }
    
    // Если город не найден
    if (!foundCity) {
        showCityError("Город не найден");
        return;
    }
    
    // Проверяем на дубликаты
    let isDuplicate = false;
    for (let i = 0; i < storedData.cities.length; i++) {
        if (storedData.cities[i].name === foundCity.name) {
            isDuplicate = true;
            break;
        }
    }
    
    if (isDuplicate) {
        showCityError("Этот город уже добавлен");
        return;
    }
    
    // Добавляем город
    hideCityError();
    storedData.cities.push(foundCity);
    saveData();
    renderCitiesList();
    
    // Очищаем поле ввода
    cityInput.value = "";
    suggestions.classList.add("hidden");
    
    showToast("Город добавлен!");
}

// Отображение списка городов
function renderCitiesList() {
    // Очищаем список
    citiesList.innerHTML = "";
    
    // Если нет городов, показываем сообщение
    if (storedData.cities.length === 0) {
        citiesList.appendChild(emptyCitiesMessage);
        emptyCitiesMessage.style.display = "block";
        return;
    }
    
    // Скрываем сообщение
    emptyCitiesMessage.style.display = "none";
    
    // Создаем кнопки для каждого города
    for (let i = 0; i < storedData.cities.length; i++) {
        const city = storedData.cities[i];
        
        const cityBtn = document.createElement("button");
        cityBtn.className = "city-btn";
        cityBtn.textContent = city.name;
        
        // Если этот город основной, добавляем класс active
        if (storedData.main && storedData.main.name === city.name) {
            cityBtn.classList.add("active");
        }
        
        // Обработчик клика по городу
        cityBtn.addEventListener("click", function() {
            storedData.main = city;
            saveData();
            loadAllWeather();
        });
        
        // Кнопка удаления
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = "×";
        removeBtn.title = "Удалить город";
        
        // Обработчик удаления
        removeBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            removeCity(i);
        });
        
        // Добавляем кнопку удаления на кнопку города
        cityBtn.appendChild(removeBtn);
        
        // Добавляем кнопку города в список
        citiesList.appendChild(cityBtn);
    }
}

// Удаление города
function removeCity(index) {
    // Запоминаем имя города
    const cityName = storedData.cities[index].name;
    
    // Удаляем город из массива
    storedData.cities.splice(index, 1);
    
    // Если удалили основной город, выбираем другой
    if (storedData.main && storedData.main.name === cityName) {
        if (storedData.cities.length > 0) {
            storedData.main = storedData.cities[0];
        } else {
            storedData.main = null;
        }
    }
    
    // Сохраняем и обновляем
    saveData();
    renderCitiesList();
    
    if (storedData.main) {
        loadAllWeather();
    }
    
    showToast("Город удален");
}

// Показ подсказок
function showSuggestions() {
    const text = cityInput.value.toLowerCase().trim();
    
    // Очищаем подсказки
    suggestions.innerHTML = "";
    
    // Если поле пустое, скрываем подсказки
    if (!text) {
        suggestions.classList.add("hidden");
        return;
    }
    
    // Ищем совпадения
    const matchedCities = [];
    for (let i = 0; i < availableCities.length; i++) {
        if (availableCities[i].name.toLowerCase().includes(text)) {
            matchedCities.push(availableCities[i]);
        }
    }
    
    // Если нет совпадений, скрываем
    if (matchedCities.length === 0) {
        suggestions.classList.add("hidden");
        return;
    }
    
    // Создаем элементы подсказок
    for (let i = 0; i < matchedCities.length; i++) {
        const city = matchedCities[i];
        
        const item = document.createElement("div");
        item.className = "suggest-item";
        item.textContent = city.name;
        
        // Обработчик клика по подсказке
        item.addEventListener("click", function() {
            cityInput.value = city.name;
            suggestions.classList.add("hidden");
        });
        
        suggestions.appendChild(item);
    }
    
    // Показываем подсказки
    suggestions.classList.remove("hidden");
}

// Показ уведомления
function showToast(message) {
    geoToast.textContent = message;
    geoToast.classList.remove("hidden");
    geoToast.classList.add("show");
    
    // Скрываем через 4 секунды
    setTimeout(function() {
        geoToast.classList.remove("show");
        setTimeout(function() {
            geoToast.classList.add("hidden");
        }, 300);
    }, 4000);
}

// Сохранение данных
function saveData() {
    localStorage.setItem("weatherApp", JSON.stringify(storedData));
}

// Управление состоянием загрузки
function showLoading() {
    loading.classList.remove("hidden");
}

function hideLoading() {
    loading.classList.add("hidden");
}

// Управление ошибками
function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
}

function showCityError(message) {
    cityError.textContent = message;
    cityError.classList.remove("hidden");
}

function hideCityError() {
    cityError.classList.add("hidden");
}