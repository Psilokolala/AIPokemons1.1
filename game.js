// Используем глобальные переменные вместо импортов
// ... existing code ...
class PerlinNoise {
    constructor() {
        this.permutation = new Array(256);
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        
        // Перемешиваем массив
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        // Дублируем массив для упрощения вычислений
        this.p = [...this.permutation, ...this.permutation];
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }
}

class Game {
    constructor(initialStars = 0) {
        console.log('Инициализация игры...');
        
        // Создаем canvas и добавляем его в body
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        document.body.appendChild(this.canvas);
        
        // Получаем контекст и проверяем его
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Failed to get canvas context');
            return;
        }
        console.log('Canvas создан и контекст получен');

        // Создаем буферный canvas для анализа пикселей
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCanvas.width = 800;
        this.bufferCanvas.height = 600;
        this.bufferCtx = this.bufferCanvas.getContext('2d');

        // Добавляем стили для canvas
        this.canvas.style.border = '1px solid black';
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '20px auto';
        document.body.style.backgroundColor = '#f0f0f0';

        // Инициализируем загрузку карты
        this.mapLoaded = false;
        this.mapImage = new Image();
        this.mapImage.src = 'assets/map.png';
        this.mapImage.onload = () => {
            console.log('Map image loaded successfully');
            this.mapLoaded = true;
            
            // Растягиваем карту на весь canvas
            this.ctx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
            this.bufferCtx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
            
            // Создаем покемонов только после загрузки карты
            this.createPokemon();
        };
        this.mapImage.onerror = () => {
            console.error('Failed to load map image');
        };

        this.pokemons = [];
        this.moonStones = [];
        this.loadingCount = 0;
        
        // Добавляем состояние драки покемонов
        this.fightingPokemons = [];
        this.sparkParticles = [];
        this.lastFightTime = 0;
        
        // Добавляем метод для удаления всех покемонов
        this.clearAllPokemons = () => {
            this.pokemons = [];
            this.loadingCount = 0;
        };
        
        // Обновляем списки покемонов по типам
        this.flyingTypes = [
            'Charizard 🔥',
            'Dragonite 🐉',
            'Rayquaza 🐉',
            'Salamence 🔥'
        ];

        this.waterTypes = [
            'Squirtle 💧',
            'Gyarados 🌊',
            'Blastoise 💦',
            'Greninja 🐸'
        ];

        this.landTypes = [
            'Pikachu ⚡️',
            'Bulbasaur 🌿',
            'Eevee ✨',
            'Mewtwo 🧠',
            'Lucario 🥋',
            'Gengar 👻',
            'Snorlax 😴',
            'Arcanine 🔥',
            'Jigglypuff 🎤',
            'Machamp 💪',
            'Venusaur 🍃',
            'Alakazam 🔮',
            'Gardevoir 💖',
            'Tyranitar 🏔',
            'Zoroark 🦊',
            'Sylveon 🎀',
            'Infernape 🔥🐵',
            'Metagross 🛡',
            'Darkrai 🌑',
            'Cyndaquil 🔥',
            'Chandelure 🕯',
            'Umbreon 🌙'
        ];

        // Объединяем все типы в один список
        this.allPokemon = [...this.flyingTypes, ...this.waterTypes, ...this.landTypes];

        // Обновляем определение типа местности
        this.terrainTypes = {
            WATER: 'water',
            LAND: 'land',
            OUT_OF_BOUNDS: 'out'
        };

        // Добавляем счетчик для анимаций
        this.animationFrame = 0;

        // Добавляем шум Перлина
        this.noise = new PerlinNoise();

        // Добавляем массив боевых фраз
        this.pokemonBattleQuotes = pokemonBattleQuotes;

        // Добавляем цитаты про Telegram Premium
        this.telegramQuotes = pokemonRandomQuotes;

        // Создаем биомы (упрощенная версия для карты)
        this.biomes = [];
        this.biomeSize = 32;
        this.generateSimpleBiomes();
        console.log('Биомы созданы:', this.biomes.length);

        // Показываем экран загрузки
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            loadingScreen.style.display = 'block';
            console.log('Экран загрузки отображен');
        }

        // Создаем лунные камни
        console.log('Создание лунных камней...');
        for (let i = 0; i < 5; i++) {
            this.moonStones.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                collected: false
            });
        }

        // Добавляем переменные для управления сообщениями
        this.currentMessage = null;
        this.messageTimer = null;
        this.messageDisplayTime = 2000;
        this.messageInterval = Math.floor(Math.random() * 3000) + 7000;
        this.lastMessagePokemon = null;
        this.lastMessageTime = 0;

        // Запускаем систему сообщений
        this.startMessageSystem();

        // Добавляем обработчик кликов
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Проверяем клик по кнопкам
            if (this.isClickOnNFTButton(x, y)) {
                window.open('https://getgems.io/collection/EQDtXpkmwbKk8HoRSEcmwo1EY5dyDns1MgucjHOgCn-ydfVX', '_blank');
                return;
            }

            if (this.isClickOnTelegramButton(x, y)) {
                window.open('https://t.me/aipokemons', '_blank');
                return;
            }

            // Проверяем клик по кнопке печенья
            if (this.isClickOnCookieButton(x, y)) {
                this.spawnCookies();
                return;
            }

            // Проверяем клик на покемона
            for (const pokemon of this.pokemons) {
                const dx = pokemon.x - x;
                const dy = pokemon.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < pokemon.size) {
                    this.handleClick(pokemon);
                    break; // Прерываем цикл после нахождения первого покемона
                }
            }
        });

        // Обновляем координаты деревьев и их размеры
        this.trees = [
            { x: 140, y: 120, radius: 25, height: 90 },
            { x: 290, y: 120, radius: 25, height: 90 },
            { x: 460, y: 100, radius: 25, height: 90 }
        ];

        // Добавляем цвета для искр
        this.sparkColors = [
            'rgba(255, 255, 0',
            'rgba(255, 0, 0',
            'rgba(0, 255, 255',
            'rgba(255, 0, 255',
            'rgba(0, 255, 0'
        ];

        // Добавляем систему погоды
        this.weather = {
            current: 'clear',
            particles: [],
            nextChangeTime: Date.now() + this.getRandomInterval(20000, 40000),
            possibleTypes: ['clear', 'rain', 'snow', 'wind']
        };

        // Параметры для частиц
        this.maxParticles = 100;
        this.windForce = 0;
        this.windAngle = 0;

        // Добавляем массив звезд
        this.stars = [];
        
        // Добавляем интервал создания новых звезд
        this.lastStarSpawnTime = 0;
        this.starSpawnInterval = 5000;
        
        // Создаем начальные звезды
        this.maxStars = Math.floor(30 / 3);
        for (let i = 0; i < this.maxStars; i++) {
            this.createStar();
        }

        // Создаем массив для хранения спящих покемонов
        this.sleepingPokemons = new Set();
        this.lastSleepCheck = 0;
        this.sleepCheckInterval = 30000; // Проверка каждые 30 секунд
        this.sleepChance = 0.5; // 50% шанс заснуть
        this.maxSleepingPokemons = Math.floor(30 * 0.3); // Максимум 30% покемонов могут спать

        // Добавляем счетчик для сообщений о краже
        this.theftMessageCount = 0;
        this.lastTheftMessageTime = 0;
        this.theftMessageInterval = 2000; // Минимальный интервал между сообщениями о краже

        // Добавляем переменные для приветствий
        this.greetingQuotes = [
            "Привет, {name}!",
            "Здравствуй, {name}!",
            "Приветствую тебя, {name}!",
            "Рад видеть тебя, {name}!",
            "Приветик, {name}!"
        ];
        this.lastGreetingTime = 0;
        this.greetingInterval = 5000; // 5 секунд между приветствиями
        this.greetingDistance = 50; // Расстояние для приветствия

        // Добавляем массив для печенья
        this.cookies = [];

        // Запускаем анимацию
        console.log('Запуск анимации...');
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    generateSimpleBiomes() {
        // Создаем упрощенную карту биомов на основе изображения
        const beachY = this.canvas.height * 0.3; // Примерная граница пляжа
        
        for (let y = 0; y < this.canvas.height; y += this.biomeSize) {
            for (let x = 0; x < this.canvas.width; x += this.biomeSize) {
                let biomeType;
                if (y < beachY) {
                    biomeType = 'forest'; // Зона с пальмами
                } else {
                    biomeType = 'sand'; // Пляжная зона
                }
                
                const biome = {
                    x: x,
                    y: y,
                    width: this.biomeSize,
                    height: this.biomeSize,
                    name: biomeType
                };
                
                // Устанавливаем цвет и границу для биома (теперь они будут прозрачными)
                switch(biome.name) {
                    case 'forest':
                        biome.color = 'rgba(46, 139, 87, 0)';
                        biome.borderColor = 'rgba(27, 77, 46, 0)';
                        break;
                    case 'sand':
                        biome.color = 'rgba(222, 184, 135, 0)';
                        biome.borderColor = 'rgba(184, 134, 11, 0)';
                        break;
                }
                
                this.biomes.push(biome);
            }
        }
    }

    // Обновляем метод определения воды
    isWater(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }
        
        // Если точка находится выше пальм (примерно 30% высоты карты), это вода
        return y < this.canvas.height * 0.3;
    }

    // Добавляем метод определения суши
    isLand(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }

        // Всё, что не вода - это суша
        return y >= this.canvas.height * 0.3;
    }

    // Обновляем метод определения типа местности
    getTerrainType(x, y) {
        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return this.terrainTypes.OUT_OF_BOUNDS;
        }

        // Для летающих покемонов всегда возвращаем доступную местность
        if (this.pokemons.some(p => p.x === x && p.y === y && p.isFlying)) {
            return this.terrainTypes.LAND;
        }

        // Проверяем тип местности
        if (this.isWater(x, y)) {
            return this.terrainTypes.WATER;
        }
        
        return this.terrainTypes.LAND;
    }

    // Обновляем создание покемонов
    createPokemon() {
        console.log('Создание покемонов...');
        this.pokemons = []; // Очищаем существующих покемонов
        this.loadingCount = 0;
        
        let attempts = 0;
        const maxAttempts = 1000;
        const usedPokemon = new Set();
        const shuffledPokemon = [...this.allPokemon].sort(() => Math.random() - 0.5);
        
        console.log('Доступные покемоны:', shuffledPokemon);
        
        for (let i = 0; i < 30; i++) {
            let x, y, species;
            let validPosition = false;
            attempts = 0;

            while (!validPosition && attempts < maxAttempts) {
                x = Math.random() * (this.canvas.width - 100) + 50;
                y = Math.random() * (this.canvas.height - 100) + 50;
                
                const terrainType = this.getTerrainType(x, y);
                const availablePokemon = shuffledPokemon.filter(p => !usedPokemon.has(p));
                
                if (availablePokemon.length === 0) {
                    console.log('Нет доступных покемонов');
                    break;
                }

                // Выбираем покемона в зависимости от местности
                if (terrainType === this.terrainTypes.WATER) {
                    species = availablePokemon.find(p => 
                        this.waterTypes.includes(p) || this.flyingTypes.includes(p)
                    );
                } else if (terrainType === this.terrainTypes.LAND) {
                    species = availablePokemon.find(p => 
                        !this.waterTypes.includes(p) || this.flyingTypes.includes(p)
                    );
                }

                // Если не нашли подходящего покемона, пробуем взять летающего
                if (!species && this.flyingTypes.some(p => availablePokemon.includes(p))) {
                    species = availablePokemon.find(p => this.flyingTypes.includes(p));
                }

                // Если все еще нет покемона, берем любого доступного
                if (!species) {
                    species = availablePokemon[0];
                }
                
                if (species) {
                    // Проверяем, что позиция подходит для типа покемона
                    const isFlying = this.flyingTypes.includes(species);
                    const isWater = this.waterTypes.includes(species);
                    
                    if (isFlying || 
                        (isWater && terrainType === this.terrainTypes.WATER) ||
                        (!isWater && terrainType === this.terrainTypes.LAND)) {
                        usedPokemon.add(species);
                        validPosition = true;
                    }
                }
                
                attempts++;
            }

            if (attempts >= maxAttempts || !species) {
                console.warn(`Не удалось найти подходящую позицию для покемона ${i + 1}`);
                continue;
            }

            console.log(`Создание покемона ${i + 1}: ${species} в позиции (${Math.floor(x)}, ${Math.floor(y)})`);
            const pokemon = new Pokemon(x, y, species);
            pokemon.isFlying = this.flyingTypes.includes(species);
            pokemon.isWater = this.waterTypes.includes(species);
            this.pokemons.push(pokemon);
            this.loadingCount++;
        }
        
        console.log(`Создано покемонов: ${this.pokemons.length}`);
    }

    animate() {
        // Увеличиваем счетчик анимации
        this.animationFrame++;
        
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Проверяем приветствия покемонов
        this.checkGreetings();

        // Отрисовываем карту как фон
        if (this.mapLoaded) {
            this.ctx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
            
            // Применяем эффекты яркости в зависимости от погоды
            this.ctx.save();
            switch (this.weather.current) {
                case 'clear':
                    // Легкое увеличение яркости для солнечной погоды
                    this.ctx.filter = 'brightness(1.1) contrast(1.05)';
                    break;
                case 'rain':
                    // Легкое затемнение и синий оттенок для дождя
                    this.ctx.filter = 'brightness(0.95) contrast(1.1) saturate(1.2)';
                    break;
                case 'snow':
                    // Легкое осветление для снега
                    this.ctx.filter = 'brightness(1.05) contrast(1.1) saturate(0.9)';
                    break;
                case 'wind':
                    // Нейтральные настройки для ветра
                    this.ctx.filter = 'brightness(1) contrast(1) saturate(1)';
                    break;
            }
            this.ctx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
            
            // Обновляем буферный canvas, если нужно
            if (this.bufferCtx.canvas.width !== this.canvas.width || 
                this.bufferCtx.canvas.height !== this.canvas.height) {
                this.bufferCanvas.width = this.canvas.width;
                this.bufferCanvas.height = this.canvas.height;
                this.bufferCtx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
            }
        }

        // Отрисовываем тени покемонов
        this.pokemons.forEach(pokemon => {
            if (!pokemon.isInFight) {
                this.drawShadow(pokemon);
            }
        });

        // Добавляем заголовок "AI Pokemons"
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillStyle = '#FFD700'; // Золотой цвет
        this.ctx.font = 'bold 36px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Добавляем обводку текста
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('AI Pokemons', this.canvas.width / 2, 40);
        
        // Рисуем сам текст
        this.ctx.fillText('AI Pokemons', this.canvas.width / 2, 40);
        
        this.ctx.restore();

        // Проверяем сон каждые 30 секунд
        const currentTime = Date.now();
        if (currentTime - this.lastSleepCheck > this.sleepCheckInterval) {
            this.lastSleepCheck = currentTime;
            
            // Проверяем только если количество спящих покемонов меньше максимума
            if (this.sleepingPokemons.size < this.maxSleepingPokemons) {
                // Выбираем случайного покемона из неспящих
                const awakePokemons = this.pokemons.filter(pokemon => !this.sleepingPokemons.has(pokemon));
                if (awakePokemons.length > 0) {
                    const randomPokemon = awakePokemons[Math.floor(Math.random() * awakePokemons.length)];
                    
                    // Проверяем шанс засыпания
                    if (Math.random() < this.sleepChance) {
                        randomPokemon.startSleeping();
                        this.sleepingPokemons.add(randomPokemon);
                        this.addMessage(randomPokemon.name + " заснул!", randomPokemon.x, randomPokemon.y);
                    }
                }
            }
        }

        // Проверяем пробуждение покемонов
        this.pokemons.forEach(pokemon => {
            if (pokemon.isSleeping && Date.now() - pokemon.sleepStartTime > pokemon.sleepDuration) {
                pokemon.wakeUp();
                this.sleepingPokemons.delete(pokemon);
                this.addMessage(pokemon.name + " проснулся!", pokemon.x, pokemon.y);
            }
        });

        // Отрисовка покемонов
        this.pokemons.forEach(pokemon => {
            if (!pokemon.isInFight) {
                pokemon.update(this.pokemons, this.moonStones, this.biomes);
            }
            
            // Отрисовка спрайта
            if (pokemon.spriteLoaded) {
                this.ctx.save();
                
                // Добавляем эффект для летающих покемонов
                if (pokemon.isFlying) {
                    const floatOffset = Math.sin(this.animationFrame * 0.05) * 5;
                    this.ctx.translate(0, floatOffset);
                }
                
                // Добавляем эффект для спящих покемонов
                if (pokemon.isSleeping) {
                    this.ctx.globalAlpha = 0.8; // Делаем покемона чуть прозрачнее
                }

                // Добавляем эффект сияния для победителя
                if (pokemon.isGlowing) {
                    const glowTime = Date.now() - pokemon.glowStartTime;
                    if (glowTime < pokemon.glowDuration) {
                        const glowIntensity = 1 - (glowTime / pokemon.glowDuration);
                        this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                        this.ctx.shadowBlur = 40 * glowIntensity;
                        this.ctx.shadowOffsetX = 0;
                        this.ctx.shadowOffsetY = 0;
                        
                        // Добавляем дополнительное свечение вокруг покемона
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.arc(pokemon.x, pokemon.y, pokemon.size * 1.2, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * glowIntensity})`;
                        this.ctx.fill();
                        this.ctx.restore();
                    } else {
                        pokemon.isGlowing = false;
                    }
                }
                
                this.ctx.drawImage(
                    pokemon.sprite,
                    pokemon.x - pokemon.size/2,
                    pokemon.y - pokemon.size/2,
                    pokemon.size,
                    pokemon.size
                );
                
                this.ctx.restore();
            }
        });

        // Проверяем столкновения покемонов и создаем драки
        this.pokemons.forEach((pokemon1, index1) => {
            this.pokemons.forEach((pokemon2, index2) => {
                if (index1 < index2) {
                    const dx = pokemon1.x - pokemon2.x;
                    const dy = pokemon1.y - pokemon2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < pokemon1.size && 
                        !this.fightingPokemons.some(fight => 
                            fight.pokemon1 === pokemon1 || 
                            fight.pokemon1 === pokemon2 || 
                            fight.pokemon2 === pokemon1 || 
                            fight.pokemon2 === pokemon2
                        ) &&
                        Date.now() - this.lastFightTime >= 30000 &&
                        (Math.random() < 0.3 || pokemon1.mood === 'angry' || pokemon2.mood === 'angry')) {
                        
                        this.lastFightTime = Date.now();
                        
                        const aggressor = Math.random() < 0.5 ? pokemon1 : pokemon2;
                        const defender = aggressor === pokemon1 ? pokemon2 : pokemon1;
                        
                        // Используем фразы из pokemonBattleQuotes
                        this.addMessage(aggressor.name, this.pokemonBattleQuotes.aggressor[Math.floor(Math.random() * this.pokemonBattleQuotes.aggressor.length)]);
                        this.addMessage(defender.name, this.pokemonBattleQuotes.defender[Math.floor(Math.random() * this.pokemonBattleQuotes.defender.length)]);
                        
                        // Вычисляем позиции для драки
                        const centerX = (pokemon1.x + pokemon2.x) / 2;
                        const centerY = (pokemon1.y + pokemon2.y) / 2;
                        const fightDistance = pokemon1.size * 1.5;
                        const angle = Math.atan2(pokemon2.y - pokemon1.y, pokemon2.x - pokemon1.x);
                        
                        this.fightingPokemons.push({
                            pokemon1: pokemon1,
                            pokemon2: pokemon2,
                            startTime: Date.now(),
                            aggressor: aggressor,
                            defender: defender,
                            lastYellTime: 0,
                            originalPositions: {
                                x1: pokemon1.x,
                                y1: pokemon1.y,
                                x2: pokemon2.x,
                                y2: pokemon2.y
                            },
                            fightPositions: {
                                x1: centerX - Math.cos(angle) * fightDistance,
                                y1: centerY - Math.sin(angle) * fightDistance,
                                x2: centerX + Math.cos(angle) * fightDistance,
                                y2: centerY + Math.sin(angle) * fightDistance
                            }
                        });

                        // Создаем искры разных цветов
                        for (let i = 0; i < 15; i++) {
                            const color = this.sparkColors[Math.floor(Math.random() * this.sparkColors.length)];
                            this.sparkParticles.push({
                                x: centerX,
                                y: centerY,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                life: 1.0,
                                color: color
                            });
                        }
                    }
                }
            });
        });

        // Обновляем драки
        this.updateFights();

        // Обновляем и отрисовываем искры
        this.sparkParticles = this.sparkParticles.filter(spark => {
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.life -= 0.05;

            if (spark.life > 0) {
                this.ctx.beginPath();
                this.ctx.fillStyle = `${spark.color}, ${spark.life})`;
                this.ctx.arc(spark.x, spark.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
                return true;
            }
            return false;
        });

        // Обновляем погоду
        this.updateWeather();

        // Добавляем отрисовку иконки погоды
        this.drawWeatherIcon();

        // Добавляем отрисовку кнопок
        this.drawButtons();

        // Отрисовка сообщений покемонов
        if (this.currentMessage) {
            this.drawMessage(this.currentMessage);
        }

        // Отрисовка звезд
        this.stars.forEach(star => {
            if (!star.collected) {
                // Рисуем звезду
                this.ctx.save();
                this.ctx.translate(star.x, star.y);
                this.ctx.rotate(star.rotation);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = 'gold';
                
                // Рисуем пятиконечную звезду
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const x = Math.cos(angle) * star.size;
                    const y = Math.sin(angle) * star.size;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();

                // Добавляем вращение
                star.rotation += 0.02;
            } else if (star.carriedBy) {
                // Рисуем звезду над покемоном, который её несет
                const offsetX = star.carriedBy.x + star.carriedBy.size/4;
                const offsetY = star.carriedBy.y - star.carriedBy.size/4;
                
                this.ctx.save();
                this.ctx.translate(offsetX, offsetY);
                this.ctx.rotate(star.rotation);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = 'gold';
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                this.ctx.shadowBlur = 10;
                
                // Рисуем пятиконечную звезду
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const x = Math.cos(angle) * star.size;
                    const y = Math.sin(angle) * star.size;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();

                // Добавляем вращение
                star.rotation += 0.05;
                
                // Обновляем позицию звезды для проверки столкновений
                star.x = offsetX;
                star.y = offsetY;
            }
        });

        // Проверяем сбор звезд покемонами
        this.pokemons.forEach(pokemon => {
            this.stars.forEach(star => {
                if (!star.collected && !star.carriedBy) {
                    const dx = pokemon.x - star.x;
                    const dy = pokemon.y - star.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < pokemon.size/2 + star.size/2) {
                        star.collected = true;
                        star.carriedBy = pokemon;
                        pokemon.carriedItem = star;
                    }
                }
            });
        });

        // Спавн новых звезд
        if (Date.now() - this.lastStarSpawnTime > this.starSpawnInterval && 
            this.stars.length < this.maxStars) {
            this.createStar();
            this.lastStarSpawnTime = Date.now();
        }

        // Проверяем возможность кражи звезд у спящих покемонов
        this.pokemons.forEach(pokemon => {
            if (!pokemon.isSleeping && !pokemon.isInFight && !pokemon.carriedItem) {
                this.pokemons.forEach(sleepingPokemon => {
                    if (sleepingPokemon.isSleeping && sleepingPokemon.carriedItem) {
                        const dx = pokemon.x - sleepingPokemon.x;
                        const dy = pokemon.y - sleepingPokemon.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < pokemon.size * 1.5) {
                            // Кража звезды
                            const star = sleepingPokemon.carriedItem;
                            star.carriedBy = pokemon;
                            sleepingPokemon.carriedItem = null;
                            pokemon.carriedItem = star;
                            
                            // Добавляем сообщение о краже с ограничением частоты
                            const now = Date.now();
                            if (now - this.lastTheftMessageTime >= this.theftMessageInterval) {
                                this.addMessage(pokemon.name, "Ха-ха, теперь звезда моя!");
                                
                                // Показываем сообщение спящего покемона только в 50% случаев
                                if (Math.random() < 0.5) {
                                    const randomPhrase = sleepingPokemonQuotes[Math.floor(Math.random() * sleepingPokemonQuotes.length)];
                                    this.addMessage(sleepingPokemon.name, randomPhrase);
                                }
                                
                                this.lastTheftMessageTime = now;
                            }
                        }
                    }
                });
            }
        });

        // Отрисовываем кнопку печенья
        this.drawCookieButton();

        // Отрисовываем печенье
        this.cookies.forEach(cookie => {
            if (!cookie.collected) {
                this.ctx.save();
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🍪', cookie.x, cookie.y);
                this.ctx.restore();
            }
        });

        // Проверяем сбор печенья покемонами
        this.pokemons.forEach(pokemon => {
            if (!pokemon.isSleeping && !pokemon.isInFight) {
                this.cookies.forEach(cookie => {
                    if (!cookie.collected) {
                        const dx = pokemon.x - cookie.x;
                        const dy = pokemon.y - cookie.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < pokemon.size/2 + cookie.size/2) {
                            cookie.collected = true;
                            // Добавляем сообщение о съедении печенья
                            const randomPhrase = pokemonCookieQuotes[Math.floor(Math.random() * pokemonCookieQuotes.length)];
                            this.addMessage(pokemon.name, randomPhrase);
                        }
                    }
                });
            }
        });

        // Удаляем собранное печенье
        this.cookies = this.cookies.filter(cookie => !cookie.collected);

        requestAnimationFrame(this.animate);
    }

    drawSandTexture(biome) {
        // Добавляем лёгкую анимацию песка
        this.ctx.strokeStyle = 'rgba(184, 134, 11, 0.1)';
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(biome.x, biome.y + biome.height * 0.5);
            this.ctx.bezierCurveTo(
                biome.x + biome.width * 0.3, 
                biome.y + biome.height * 0.4 + Math.sin(this.animationFrame * 0.02 + i) * 2,
                biome.x + biome.width * 0.7, 
                biome.y + biome.height * 0.6 + Math.sin(this.animationFrame * 0.02 + i) * 2,
                biome.x + biome.width, 
                biome.y + biome.height * 0.5
            );
            this.ctx.stroke();
        }
    }

    // Обновляем метод определения воды
    isWater(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }
        
        // Если точка находится выше пальм (примерно 30% высоты карты), это вода
        return y < this.canvas.height * 0.3;
    }

    // Добавляем метод определения суши
    isLand(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }

        // Всё, что не вода - это суша
        return y >= this.canvas.height * 0.3;
    }

    // Обновляем метод определения типа местности
    getTerrainType(x, y) {
        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return this.terrainTypes.OUT_OF_BOUNDS;
        }

        // Для летающих покемонов всегда возвращаем доступную местность
        if (this.pokemons.some(p => p.x === x && p.y === y && p.isFlying)) {
            return this.terrainTypes.LAND;
        }

        // Проверяем тип местности
        if (this.isWater(x, y)) {
            return this.terrainTypes.WATER;
        }
        
        return this.terrainTypes.LAND;
    }

    // Обновляем метод для запуска системы сообщений
    startMessageSystem() {
        const generateInterval = () => Math.floor(Math.random() * 3000) + 7000; // 7-10 секунд

        const showRandomMessage = () => {
            if (this.pokemons.length === 0) return;

            // Выбираем случайного покемона, который не дерется
            const availablePokemons = this.pokemons.filter(p => !p.isInFight);
            if (availablePokemons.length === 0) return;

            const pokemon = availablePokemons[Math.floor(Math.random() * availablePokemons.length)];
            
            // Проверяем, прошло ли достаточно времени с последнего сообщения этого покемона
            const now = Date.now();
            if (pokemon === this.lastMessagePokemon && now - this.lastMessageTime < 15000) return;

            // Выбираем случайную фразу
            const randomPhrase = pokemonRandomQuotes[Math.floor(Math.random() * pokemonRandomQuotes.length)];
            
            // Добавляем сообщение
            this.addMessage(pokemon.name, randomPhrase);
            
            // Обновляем время последнего сообщения
            this.lastMessagePokemon = pokemon;
            this.lastMessageTime = now;
        };

        // Запускаем систему сообщений с случайными интервалами
        const scheduleNextMessage = () => {
            setTimeout(() => {
                showRandomMessage();
                scheduleNextMessage();
            }, generateInterval());
        };

        scheduleNextMessage();
    }

    // Добавляем вспомогательный метод для рисования скругленных прямоугольников
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    // Добавляем метод создания частицы погоды
    createWeatherParticle() {
        const particle = {
            x: Math.random() * this.canvas.width,
            y: -10,
            speed: Math.random() * 2 + 3,
            size: 0,
            angle: 0
        };

        switch (this.weather.current) {
            case 'rain':
                particle.size = Math.random() * 2 + 3;
                particle.angle = Math.PI / 3; // Угол падения дождя
                particle.color = 'rgba(120, 120, 255, 0.5)';
                break;
            case 'snow':
                particle.size = Math.random() * 3 + 2;
                particle.speed = Math.random() * 1 + 1;
                particle.angle = Math.PI / 2;
                particle.rotation = Math.random() * Math.PI * 2;
                particle.color = 'rgba(255, 255, 255, 0.8)';
                break;
            case 'wind':
                particle.size = Math.random() * 2 + 1;
                particle.x = -10;
                particle.y = Math.random() * this.canvas.height;
                particle.speed = Math.random() * 3 + 2;
                particle.color = 'rgba(200, 200, 200, 0.3)';
                break;
        }

        return particle;
    }

    // Добавляем метод обновления погоды
    updateWeather() {
        // Проверяем, нужно ли сменить погоду
        if (Date.now() > this.weather.nextChangeTime) {
            const newWeather = this.weather.possibleTypes[
                Math.floor(Math.random() * this.weather.possibleTypes.length)
            ];
            this.weather.current = newWeather;
            this.weather.nextChangeTime = Date.now() + this.getRandomInterval(20000, 40000);
            this.weather.particles = []; // Очищаем старые частицы

            // Обновляем параметры ветра
            if (this.weather.current === 'wind') {
                this.windForce = Math.random() * 2 + 1;
                this.windAngle = Math.random() * Math.PI / 4;
            }
        }

        // Добавляем новые частицы
        if (this.weather.current !== 'clear' && 
            this.weather.particles.length < this.maxParticles) {
            this.weather.particles.push(this.createWeatherParticle());
        }

        // Обновляем существующие частицы
        this.weather.particles = this.weather.particles.filter(particle => {
            // Обновляем позицию частицы
            switch (this.weather.current) {
                case 'rain':
                    particle.x += Math.cos(particle.angle) * particle.speed;
                    particle.y += Math.sin(particle.angle) * particle.speed;
                    break;
                case 'snow':
                    particle.x += Math.sin(particle.rotation) * 0.5 + Math.cos(this.windAngle) * this.windForce;
                    particle.y += particle.speed;
                    particle.rotation += 0.01;
                    break;
                case 'wind':
                    particle.x += particle.speed + Math.cos(this.windAngle) * this.windForce;
                    particle.y += Math.sin(this.windAngle) * this.windForce;
                    break;
            }

            // Отрисовываем частицу
            this.ctx.fillStyle = particle.color;
            
            if (this.weather.current === 'snow') {
                // Рисуем снежинку
                this.ctx.save();
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);
                
                for (let i = 0; i < 6; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(0, particle.size);
                    this.ctx.stroke();
                    this.ctx.rotate(Math.PI / 3);
                }
                
                this.ctx.restore();
            } else {
                // Рисуем дождь или ветер
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Проверяем, находится ли частица все еще в пределах экрана
            return !(particle.y > this.canvas.height || 
                    particle.x > this.canvas.width || 
                    particle.x < -20);
        });
    }

    // Обновляем метод отрисовки иконки погоды
    drawWeatherIcon() {
        this.ctx.save();
        
        // Создаем фон для иконки
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height - 25, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Добавляем тень
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Устанавливаем размер шрифта для эмодзи
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Выбираем эмодзи в зависимости от погоды
        let emoji;
        switch (this.weather.current) {
            case 'rain':
                emoji = '🌧️';
                break;
            case 'snow':
                emoji = '🌨️';
                break;
            case 'wind':
                emoji = '💨';
                break;
            case 'clear':
                emoji = '☀️';
                break;
        }

        // Рисуем эмодзи
        this.ctx.fillText(emoji, this.canvas.width / 2, this.canvas.height - 25);
        
        // Сбрасываем тень
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        this.ctx.restore();
    }

    // Добавляем метод проверки клика по кнопке NFT
    isClickOnNFTButton(x, y) {
        const buttonX = this.canvas.width - 160;
        const buttonY = this.canvas.height - 40;
        const buttonWidth = 140;
        const buttonHeight = 30;
        
        return x >= buttonX && x <= buttonX + buttonWidth &&
               y >= buttonY && y <= buttonY + buttonHeight;
    }

    // Добавляем метод проверки клика по кнопке Telegram
    isClickOnTelegramButton(x, y) {
        const buttonX = 20;
        const buttonY = this.canvas.height - 40;
        const buttonWidth = 140;
        const buttonHeight = 30;
        
        return x >= buttonX && x <= buttonX + buttonWidth &&
               y >= buttonY && y <= buttonY + buttonHeight;
    }

    // Добавляем метод проверки клика по кнопке печенья
    isClickOnCookieButton(x, y) {
        const buttonX = 190;
        const buttonY = this.canvas.height - 30;
        const buttonRadius = 20;
        
        const dx = x - buttonX;
        const dy = y - buttonY;
        return Math.sqrt(dx * dx + dy * dy) <= buttonRadius;
    }

    // Добавляем метод отрисовки кнопок
    drawButtons() {
        // Рисуем кнопку NFT справа внизу
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Фон кнопки
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        this.roundRect(
            this.canvas.width - 160,
            this.canvas.height - 40,
            140,
            30,
            15
        );
        this.ctx.fill();
        
        // Обводка кнопки
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Текст кнопки
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('NFT Collection', this.canvas.width - 90, this.canvas.height - 25);
        
        this.ctx.restore();

        // Рисуем кнопку Telegram слева внизу
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Фон кнопки
        this.ctx.fillStyle = 'rgba(0, 136, 204, 0.7)';
        this.roundRect(
            20,
            this.canvas.height - 40,
            140,
            30,
            15
        );
        this.ctx.fill();
        
        // Обводка кнопки
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Текст кнопки
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Telegram Channel', 90, this.canvas.height - 25);
        
        this.ctx.restore();
    }

    handleClick(pokemon) {
        // Проверяем клик по кнопкам
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Проверяем клик по кнопке NFT Collection
        if (this.isClickOnNFTButton(x, y)) {
            window.open('https://getgems.io/collection/EQDtXpkmwbKk8HoRSEcmwo1EY5dyDns1MgucjHOgCn-ydfVX', '_blank');
            return;
        }

        // Проверяем клик по кнопке Telegram Channel
        if (this.isClickOnTelegramButton(x, y)) {
            window.open('https://t.me/aipokemons', '_blank');
            return;
        }

        if (!pokemon.isInFight) {
            console.log('Клик по покемону:', pokemon.name);
            
            // Проверяем, спит ли покемон
            if (pokemon.wakeUpOnClick()) {
                // Используем случайную фразу из pokemonClickQuotes
                const randomPhrase = pokemonClickQuotes[Math.floor(Math.random() * pokemonClickQuotes.length)];
                this.addMessage(pokemon.name, randomPhrase);
                return;
            }
            
            // Добавляем вибрацию при клике на покемона
            if (navigator.vibrate) {
                navigator.vibrate(50); // 50мс вибрации
            }

            // Выбираем случайную фразу из импортированного массива
            const randomPhrase = pokemonClickQuotes[Math.floor(Math.random() * pokemonClickQuotes.length)];
            console.log('Выбрана фраза:', randomPhrase);
            
            // Создаем сообщение для конкретного покемона
            this.currentMessage = {
                pokemon: pokemon,
                text: randomPhrase,
                timeLeft: this.messageDisplayTime
            };

            // Очищаем предыдущий таймер
            if (this.messageTimer) {
                clearTimeout(this.messageTimer);
            }

            // Устанавливаем таймер для скрытия сообщения
            this.messageTimer = setTimeout(() => {
                console.log('Сообщение скрыто по таймеру');
                this.currentMessage = null;
            }, this.messageDisplayTime);
        }
    }

    // Добавляем метод для отображения сообщений
    addMessage(pokemonName, text) {
        console.log('Добавление сообщения для покемона:', pokemonName);
        console.log('Текст сообщения:', text);
        
        // Очищаем предыдущий таймер
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
        }

        // Находим покемона по имени
        const pokemon = this.pokemons.find(p => p.name === pokemonName);
        console.log('Найден покемон:', pokemon ? pokemon.name : 'не найден');
        
        if (!pokemon) {
            console.log('Покемон не найден:', pokemonName);
            return;
        }

        // Устанавливаем текущее сообщение напрямую для найденного покемона
        this.currentMessage = {
            pokemon: pokemon,
            text: text,
            timeLeft: this.messageDisplayTime
        };

        // Устанавливаем таймер для скрытия сообщения
        this.messageTimer = setTimeout(() => {
            console.log('Сообщение скрыто по таймеру');
            this.currentMessage = null;
        }, this.messageDisplayTime);
    }

    // Добавляем метод для получения случайного интервала
    getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Обновляем метод для обновления драки
    updateFights() {
        this.fightingPokemons = this.fightingPokemons.filter(fight => {
            const elapsed = Date.now() - fight.startTime;
            
            if (elapsed < 3000) {
                // Добавляем случайные выкрики во время драки
                if (Date.now() - fight.lastYellTime > 1000) {
                    if (Math.random() < 0.4) {
                        const fighter = Math.random() < 0.5 ? fight.aggressor : fight.defender;
                        const quotes = fighter === fight.aggressor ? 
                            this.pokemonBattleQuotes.aggressor : this.pokemonBattleQuotes.defender;
                        
                        // Создаем сообщение для конкретного покемона
                        this.currentMessage = {
                            pokemon: fighter,
                            text: quotes[Math.floor(Math.random() * quotes.length)],
                            timeLeft: this.messageDisplayTime
                        };

                        // Очищаем предыдущий таймер
                        if (this.messageTimer) {
                            clearTimeout(this.messageTimer);
                        }

                        // Устанавливаем таймер для скрытия сообщения
                        this.messageTimer = setTimeout(() => {
                            this.currentMessage = null;
                        }, this.messageDisplayTime);
                    }
                    fight.lastYellTime = Date.now();
                }

                // Анимация драки
                const shake = Math.sin(elapsed * 0.1) * 3;
                fight.pokemon1.x = fight.fightPositions.x1 + shake;
                fight.pokemon2.x = fight.fightPositions.x2 - shake;
                
                fight.pokemon1.isInFight = true;
                fight.pokemon2.isInFight = true;

                // Создаем новые искры
                if (Math.random() < 0.3) {
                    const color = this.sparkColors[Math.floor(Math.random() * this.sparkColors.length)];
                    this.sparkParticles.push({
                        x: (fight.pokemon1.x + fight.pokemon2.x) / 2,
                        y: (fight.pokemon1.y + fight.pokemon2.y) / 2,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        life: 1.0,
                        color: color
                    });
                }

                // Обмен звездами во время драки
                if (Math.random() < 0.01) { // 1% шанс каждый кадр
                    const stars = this.stars.filter(star => 
                        star.carriedBy === fight.pokemon1 || star.carriedBy === fight.pokemon2
                    );
                    
                    if (stars.length > 0) {
                        const currentWinner = Math.random() < 0.5 ? fight.pokemon1 : fight.pokemon2;
                        const loser = currentWinner === fight.pokemon1 ? fight.pokemon2 : fight.pokemon1;
                        
                        stars.forEach(star => {
                            if (star.carriedBy === loser) {
                                // Звезда падает на землю
                                star.collected = false;
                                star.carriedBy = null;
                                loser.carriedItem = null;
                                
                                // Звезда падает рядом с местом драки
                                star.x = (fight.pokemon1.x + fight.pokemon2.x) / 2 + (Math.random() - 0.5) * 50;
                                star.y = (fight.pokemon1.y + fight.pokemon2.y) / 2 + (Math.random() - 0.5) * 50;
                            }
                        });
                    }
                }

                return true;
            } else {
                // Завершаем драку
                fight.pokemon1.x = fight.originalPositions.x1;
                fight.pokemon1.y = fight.originalPositions.y1;
                fight.pokemon2.x = fight.originalPositions.x2;
                fight.pokemon2.y = fight.originalPositions.y2;
                
                fight.pokemon1.isInFight = false;
                fight.pokemon2.isInFight = false;
                
                fight.pokemon1.mood = Math.random() < 0.5 ? 'angry' : 'normal';
                fight.pokemon2.mood = Math.random() < 0.5 ? 'angry' : 'normal';
                
                const winner = Math.random() < 0.5 ? fight.pokemon1 : fight.pokemon2;
                const loser = winner === fight.pokemon1 ? fight.pokemon2 : fight.pokemon1;
                
                // Добавляем эффект сияния для победителя
                winner.isGlowing = true;
                winner.glowStartTime = Date.now();
                winner.glowDuration = 3000; // 3 секунды

                // Создаем сообщения для победителя и проигравшего
                this.currentMessage = {
                    pokemon: winner,
                    text: this.pokemonBattleQuotes.winner[Math.floor(Math.random() * this.pokemonBattleQuotes.winner.length)],
                    timeLeft: this.messageDisplayTime
                };

                // Очищаем предыдущий таймер
                if (this.messageTimer) {
                    clearTimeout(this.messageTimer);
                }

                // Устанавливаем таймер для скрытия сообщения
                this.messageTimer = setTimeout(() => {
                    this.currentMessage = null;
                }, this.messageDisplayTime);
                
                return false;
            }
        });
    }

    // Добавляем метод для отрисовки сообщения
    drawMessage(message) {
        const pokemon = message.pokemon;
        const text = message.text;
        
        // Рисуем облако сообщения
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        
        // Измеряем текст с обычным жирным шрифтом
        this.ctx.font = 'bold 14px Arial';
        const metrics = this.ctx.measureText(text);
        const padding = 8;
        const bubbleWidth = metrics.width + padding * 2;
        const bubbleHeight = 25;
        
        // Находим позицию для текста без тряски
        let textX = pokemon.x;
        let textY = pokemon.y;
        
        // Если покемон в драке, используем его позицию до тряски
        const fight = this.fightingPokemons.find(f => 
            f.pokemon1 === pokemon || f.pokemon2 === pokemon
        );
        
        if (fight) {
            if (fight.pokemon1 === pokemon) {
                textX = fight.fightPositions.x1;
                textY = fight.fightPositions.y1;
            } else {
                textX = fight.fightPositions.x2;
                textY = fight.fightPositions.y2;
            }
        }
        
        // Рисуем облако с закругленными углами
        // Проверяем и корректируем позицию облака, чтобы оно не выходило за границы
        let bubbleX = textX - bubbleWidth/2;
        let bubbleY = textY - 40; // Поднимаем облако над покемоном
        
        // Корректируем позицию по X
        if (bubbleX < 0) {
            bubbleX = 0;
        } else if (bubbleX + bubbleWidth > this.canvas.width) {
            bubbleX = this.canvas.width - bubbleWidth;
        }
        
        this.ctx.beginPath();
        this.roundRect(
            bubbleX,
            bubbleY,
            bubbleWidth,
            bubbleHeight,
            10
        );
        this.ctx.fill();
        this.ctx.stroke();
        
        // Рисуем текст с учетом скорректированной позиции
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(
            text,
            bubbleX + bubbleWidth/2,
            bubbleY + bubbleHeight/2
        );
        
        this.ctx.restore();
    }

    // Добавляем метод создания звезды
    createStar() {
        const star = {
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            size: 8,
            rotation: Math.random() * Math.PI * 2,
            collected: false,
            carriedBy: null
        };
        this.stars.push(star);
    }

    checkGreetings() {
        const currentTime = Date.now();
        
        // Проверяем, прошло ли достаточно времени с последнего приветствия
        if (currentTime - this.lastGreetingTime < this.greetingInterval) {
            return;
        }

        console.log('Проверка приветствий...');
        
        // Проверяем все пары покемонов
        for (let i = 0; i < this.pokemons.length; i++) {
            for (let j = i + 1; j < this.pokemons.length; j++) {
                const pokemon1 = this.pokemons[i];
                const pokemon2 = this.pokemons[j];
                
                // Проверяем расстояние между покемонами
                const dx = pokemon1.x - pokemon2.x;
                const dy = pokemon1.y - pokemon2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                console.log(`Расстояние между ${pokemon1.name} и ${pokemon2.name}: ${distance}`);
                
                // Проверяем, находятся ли покемоны достаточно близко и не спят ли они
                if (distance < this.greetingDistance && 
                    !pokemon1.isSleeping && 
                    !pokemon2.isSleeping && 
                    !pokemon1.isInFight && 
                    !pokemon2.isInFight &&
                    Math.random() < 0.001) { // Уменьшаем шанс приветствия до 0.1%
                    
                    console.log(`${pokemon1.name} и ${pokemon2.name} встретились!`);
                    
                    // Выбираем случайную фразу приветствия
                    const greeting = this.greetingQuotes[Math.floor(Math.random() * this.greetingQuotes.length)];
                    
                    // Форматируем приветствие с именами покемонов
                    const formattedGreeting = this.formatGreeting(greeting, pokemon1.name);
                    
                    // Добавляем сообщение
                    this.addMessage(pokemon1.name, formattedGreeting);
                    
                    // Обновляем время последнего приветствия
                    this.lastGreetingTime = currentTime;
                }
            }
        }
    }

    drawShadow(pokemon) {
        const shadowSize = pokemon.size * 0.8;
        const shadowY = pokemon.y + pokemon.size * 0.3;
        
        // Для летающих покемонов тень меньше и прозрачнее
        if (pokemon.isFlying) {
            this.ctx.beginPath();
            this.ctx.ellipse(pokemon.x, shadowY, shadowSize * 0.17, shadowSize * 0.1, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fill();
        } else {
            // Для обычных покемонов тень больше и темнее
            this.ctx.beginPath();
            this.ctx.ellipse(pokemon.x, shadowY, shadowSize * 0.27, shadowSize * 0.15, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fill();
        }
    }

    formatGreeting(greeting, pokemonName) {
        return greeting.replace('{name}', pokemonName);
    }

    // Добавляем метод создания печенья
    spawnCookies() {
        const cookieCount = Math.floor(Math.random() * 3) + 5; // От 5 до 7 печенья
        
        for (let i = 0; i < cookieCount; i++) {
            const cookie = {
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (this.canvas.height - 100) + 50,
                size: 15,
                collected: false
            };
            this.cookies.push(cookie);
        }
    }

    // Добавляем метод отрисовки кнопки печенья
    drawCookieButton() {
        this.ctx.save();
        
        // Рисуем круглую кнопку
        this.ctx.beginPath();
        this.ctx.arc(190, this.canvas.height - 30, 20, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Рисуем эмодзи печенья
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🍪', 190, this.canvas.height - 30);
        
        this.ctx.restore();
    }
}

// Запуск игры
window.onload = () => {
    console.log('Запуск игры...');
    window.gameInstance = new Game();
}; 