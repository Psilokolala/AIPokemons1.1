class Pokemon {
    constructor(x, y, species) {
        this.x = x;
        this.y = y;
        this.name = species; // Сохраняем полное имя с эмодзи
        this.species = species.split(' ')[0]; // Убираем эмодзи из имени
        this.size = 48;
        this.speed = 0.5; // Уменьшаем скорость в 2 раза
        this.moonStonesCollected = 0;
        this.spriteLoaded = false;
        this.mood = 'normal';
        
        // Добавляем параметры для движения
        this.targetX = x;
        this.targetY = y;
        this.isMoving = false;
        this.moveTimer = 0;
        this.outOfBoundsTimer = 0;
        this.isOutOfBounds = false;
        this.direction = Math.random() * Math.PI * 2;
        this.changeDirectionCounter = 0;
        this.maxChangeDirectionTime = 200; // Увеличиваем время между сменой направления
        
        // Флаги типов покемонов (будут установлены в Game.createPokemon)
        this.isFlying = false;
        this.isWater = false;
        this.isInFight = false;

        // Создаем новый объект Image
        this.sprite = new Image();
        const pokemonId = this.getPokemonId();
        console.log(`Загрузка спрайта для ${this.species} (ID: ${pokemonId})`);
        
        // Устанавливаем обработчики до установки src
        this.sprite.onload = () => {
            console.log(`Спрайт загружен: ${this.species}`);
            this.spriteLoaded = true;
            if (window.gameInstance) {
                window.gameInstance.loadingCount--;
            }
        };
        
        this.sprite.onerror = (error) => {
            console.error(`Ошибка загрузки спрайта для ${this.species}:`, error);
            const fallbackId = pokemonId || Math.floor(Math.random() * 151) + 1;
            console.log(`Пробуем загрузить резервный спрайт (ID: ${fallbackId})`);
            this.sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fallbackId}.png`;
        };
        
        // Загружаем спрайт покемона
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
        console.log(`Загружаем спрайт с URL: ${spriteUrl}`);
        this.sprite.crossOrigin = 'Anonymous'; // Добавляем поддержку CORS
        this.sprite.src = spriteUrl;

        // Добавляем свойства для сна
        this.isSleeping = false;
        this.sleepStartTime = null;
        this.sleepDuration = null;
        this.originalSpeed = this.speed;
    }

    getPokemonId() {
        const pokemonIds = {
            'Pikachu': 25,
            'Charizard': 6,
            'Bulbasaur': 1,
            'Squirtle': 7,
            'Eevee': 133,
            'Mewtwo': 150,
            'Lucario': 448,
            'Gengar': 94,
            'Snorlax': 143,
            'Dragonite': 149,
            'Gyarados': 130,
            'Arcanine': 59,
            'Jigglypuff': 39,
            'Machamp': 68,
            'Blastoise': 9,
            'Venusaur': 3,
            'Alakazam': 65,
            'Gardevoir': 282,
            'Tyranitar': 248,
            'Rayquaza': 384,
            'Salamence': 373,
            'Greninja': 658,
            'Zoroark': 571,
            'Sylveon': 700,
            'Infernape': 392,
            'Metagross': 376,
            'Darkrai': 491,
            'Cyndaquil': 155,
            'Chandelure': 609,
            'Umbreon': 197
        };
        return pokemonIds[this.species] || 25;
    }

    update(pokemons, moonStones, biomes) {
        if (this.isSleeping) {
            // Проверяем, не пора ли проснуться
            if (Date.now() - this.sleepStartTime > this.sleepDuration) {
                this.wakeUp();
            }
            return; // Не обновляем позицию, если покемон спит
        }

        // Если покемон в драке, не обновляем его позицию
        if (this.isInFight) return;

        const now = Date.now();
        
        // Обновляем таймер нахождения за пределами карты
        if (this.isOutOfBounds) {
            this.outOfBoundsTimer += 16; // Примерно 60 FPS
            if (this.outOfBoundsTimer >= 60000) { // 1 минута
                this.returnToMap();
            }
        }

        // Увеличиваем счетчик смены направления
        this.changeDirectionCounter++;

        // Меняем направление через случайные промежутки времени
        if (this.changeDirectionCounter >= this.maxChangeDirectionTime) {
            this.direction = Math.random() * Math.PI * 2;
            this.changeDirectionCounter = 0;
            this.maxChangeDirectionTime = 150 + Math.random() * 100; // Случайное время до следующей смены направления
        }

        // Рассчитываем новую позицию
        let newX = this.x + Math.cos(this.direction) * this.speed;
        let newY = this.y + Math.sin(this.direction) * this.speed;

        // Получаем размеры карты из canvas
        const canvas = document.querySelector('canvas');
        const margin = this.size / 2; // Отступ от края

        // Проверяем границы карты
        if (newX < margin || newX > canvas.width - margin) {
            this.direction = Math.PI - this.direction; // Отражаем по горизонтали
            newX = this.x; // Возвращаемся на предыдущую позицию
        }
        if (newY < margin || newY > canvas.height - margin) {
            this.direction = -this.direction; // Отражаем по вертикали
            newY = this.y; // Возвращаемся на предыдущую позицию
        }

        // Проверяем тип местности перед перемещением
        const game = window.gameInstance;
        if (game) {
            const terrainType = game.getTerrainType(newX, newY);
            const canMove = this.isFlying || 
                          (this.isWater && terrainType === game.terrainTypes.WATER) ||
                          (!this.isWater && terrainType === game.terrainTypes.LAND);

            if (canMove) {
                this.x = newX;
                this.y = newY;
            } else {
                // Если не можем двигаться, меняем направление
                this.direction = Math.random() * Math.PI * 2;
            }
        }

        // Проверяем сбор лунных камней
        this.collectMoonStones(moonStones);
    }

    returnToMap() {
        // Возвращаем покемона на карту
        this.isOutOfBounds = false;
        this.outOfBoundsTimer = 0;
        
        // Находим ближайшую точку на границе карты
        if (this.x < 0) this.x = 0;
        if (this.x >= 800) this.x = 799;
        if (this.y < 0) this.y = 0;
        if (this.y >= 600) this.y = 599;
    }

    collectMoonStones(moonStones) {
        moonStones.forEach(stone => {
            if (!stone.collected) {
                const dx = this.x - stone.x;
                const dy = this.y - stone.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.size) {
                    stone.collected = true;
                    this.moonStonesCollected++;
                }
            }
        });
    }

    getCurrentBiome(biomes) {
        return biomes.find(biome => 
            this.x >= biome.x && 
            this.x < biome.x + biome.width && 
            this.y >= biome.y && 
            this.y < biome.y + biome.height
        );
    }

    // Добавляем метод для сна
    startSleeping() {
        this.isSleeping = true;
        this.sleepStartTime = Date.now();
        this.sleepDuration = 30000 + Math.random() * 30000; // Случайная длительность от 30 до 60 секунд
        this.originalSpeed = this.speed;
        this.speed = 0;
        console.log(`${this.name} заснул на ${Math.floor(this.sleepDuration/1000)} секунд`);
    }

    // Добавляем метод для пробуждения
    wakeUp() {
        this.isSleeping = false;
        this.speed = this.originalSpeed;
        this.sleepStartTime = null;
        this.sleepDuration = null;
        console.log(`${this.name} проснулся!`);
    }

    wakeUpOnClick() {
        if (this.isSleeping) {
            this.wakeUp();
            return true;
        }
        return false;
    }
} 