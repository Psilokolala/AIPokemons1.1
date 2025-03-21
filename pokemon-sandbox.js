window.Pokemon = class Pokemon {
    constructor(x, y, species, size = 40) {
        this.x = x;
        this.y = y;
        this.species = species;
        this.name = species;
        this.size = size;
        this.speed = 0.5 + Math.random() * 0.3; // Случайная скорость для каждого покемона
        this.originalSpeed = this.speed;
        this.direction = Math.random() * Math.PI * 2;
        this.changeDirectionInterval = 3000 + Math.random() * 4000; // Случайный интервал для каждого покемона
        this.lastDirectionChange = Date.now() - Math.random() * 3000; // Случайное начальное время
        this.sprite = new Image();
        this.sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.getPokemonId()}.png`;
        this.sprite.onload = () => {
            this.spriteLoaded = true;
        };
        
        // Добавляем состояния для боя
        this.isInFight = false;
        this.mood = 'normal'; // normal, angry
        
        // Добавляем состояния для полета
        this.isFlying = false;
        
        // Добавляем состояния для воды
        this.isWater = false;
        
        // Добавляем состояния для сна
        this.isSleeping = false;
        this.sleepStartTime = 0;
        this.sleepDuration = 10000; // 10 секунд
        
        // Добавляем состояние для свечения
        this.isGlowing = false;
        this.glowStartTime = 0;
        this.glowDuration = 3000; // 3 секунды
        
        // Добавляем переменную для хранения предмета
        this.carriedItem = null;

        // Добавляем параметры для плавного движения
        this.targetX = x + (Math.random() - 0.5) * 100; // Случайная начальная цель
        this.targetY = y + (Math.random() - 0.5) * 100;
        this.moveTimer = 0;
        this.idleTimer = Math.random() * 2000; // Случайное время ожидания перед началом движения
        this.isIdle = Math.random() < 0.3; // 30% шанс начать в состоянии покоя
    }

    getPokemonId() {
        // Преобразуем имя покемона в ID
        const nameToId = {
            'Pikachu ⚡️': 25,
            'Charizard 🔥': 6,
            'Bulbasaur 🌿': 1,
            'Squirtle 💧': 7,
            'Mewtwo 🧠': 150,
            'Dragonite 🐉': 149,
            'Gyarados 🌊': 130,
            'Snorlax 😴': 143,
            'Eevee ✨': 133,
            'Gengar 👻': 94,
            'Rayquaza 🐉': 384,
            'Lucario 🥋': 448,
            'Greninja 🐸': 658,
            'Arcanine 🔥': 59,
            'Jigglypuff 🎤': 39,
            'Machamp 💪': 68,
            'Venusaur 🍃': 3,
            'Blastoise 💦': 9,
            'Alakazam 🔮': 65,
            'Gardevoir 💖': 282,
            'Tyranitar 🏔': 248,
            'Salamence 🔥': 373,
            'Zoroark 🦊': 571,
            'Sylveon 🎀': 700,
            'Infernape 🔥🐵': 392,
            'Metagross 🛡': 376,
            'Darkrai 🌑': 491,
            'Cyndaquil 🔥': 155,
            'Chandelure 🕯': 609,
            'Umbreon 🌙': 197
        };
        
        return nameToId[this.species] || 25; // Возвращаем Pikachu как значение по умолчанию
    }

    update(pokemons, moonStones, biomes) {
        if (this.isSleeping || this.isInFight) {
            return;
        }

        // Обработка состояния покоя
        if (this.isIdle) {
            this.idleTimer -= 16; // Примерно 60 FPS
            if (this.idleTimer <= 0) {
                this.isIdle = false;
                this.idleTimer = Math.random() * 2000;
            }
            return;
        }

        // Проверяем, не пора ли изменить направление
        if (Date.now() - this.lastDirectionChange > this.changeDirectionInterval) {
            this.direction = Math.random() * Math.PI * 2;
            this.lastDirectionChange = Date.now();
            this.changeDirectionInterval = 3000 + Math.random() * 4000; // Новый случайный интервал
            
            // Устанавливаем новую целевую точку
            const distance = Math.random() * 100 + 30; // Случайное расстояние
            this.targetX = this.x + Math.cos(this.direction) * distance;
            this.targetY = this.y + Math.sin(this.direction) * distance;
            
            // Проверяем границы
            this.targetX = Math.max(this.size, Math.min(800 - this.size, this.targetX));
            this.targetY = Math.max(this.size, Math.min(600 - this.size, this.targetY));

            // Шанс перейти в состояние покоя
            if (Math.random() < 0.2) { // 20% шанс
                this.isIdle = true;
                return;
            }
        }

        // Плавно двигаемся к целевой точке
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            const speed = this.speed * (0.8 + Math.random() * 0.4); // Случайные колебания скорости
            this.x += (dx / distance) * speed;
            this.y += (dy / distance) * speed;
        } else {
            // Достигли цели, можем перейти в состояние покоя
            if (Math.random() < 0.1) { // 10% шанс
                this.isIdle = true;
                this.idleTimer = Math.random() * 1500 + 500;
            }
        }

        // Проверяем границы
        if (this.x < this.size || this.x > 800 - this.size) {
            this.direction = Math.PI - this.direction;
            this.x = Math.max(this.size, Math.min(800 - this.size, this.x));
            this.targetX = this.x + Math.cos(this.direction) * 50;
        }
        if (this.y < this.size || this.y > 600 - this.size) {
            this.direction = -this.direction;
            this.y = Math.max(this.size, Math.min(600 - this.size, this.y));
            this.targetY = this.y + Math.sin(this.direction) * 50;
        }
    }

    startSleeping() {
        if (!this.isSleeping) {
            this.isSleeping = true;
            this.sleepStartTime = Date.now();
            this.speed = 0;
        }
    }

    wakeUp() {
        if (this.isSleeping) {
            this.isSleeping = false;
            this.speed = this.originalSpeed;
        }
    }

    wakeUpOnClick() {
        if (this.isSleeping) {
            this.wakeUp();
            return true;
        }
        return false;
    }
}; 