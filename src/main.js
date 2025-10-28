import './style.css'

const POKEMON_API = (idOrName) => `https://pokeapi.co/api/v2/pokemon/${idOrName}`;
const TYPE_API = (typeName) => `https://pokeapi.co/api/v2/type/${typeName}`;
const MAX_POKEMON_ID = 1025;

let firstPokemon = null;
let secondPokemon = null;

const querySelector = (selector) => document.querySelector(selector);
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
const getRandomPokemonId = () => Math.floor(Math.random() * MAX_POKEMON_ID) + 1;

function getStatValue(pokemonData, statName, fallbackValue = 0) {
    const foundStat = pokemonData.stats?.find(stat => stat.stat?.name === statName);
    return foundStat?.base_stat ?? fallbackValue;
}

function mapPokemonData(apiData) {
    return {
        id: apiData.id,
        name: apiData.name,
        frontSprite: apiData.sprites?.front_default ?? '',
        backSprite: apiData.sprites?.back_default ?? '',
        hp: getStatValue(apiData, 'hp', 0),
        attack: getStatValue(apiData, 'attack', 0),
        typeName: apiData.types?.[0]?.type?.name ?? 'unknown',
    };
}

async function fetchPokemonById(pokemonId) {
    const response = await fetch(POKEMON_API(pokemonId));
    if (!response.ok) throw new Error(`Failed to fetch pokemon ${pokemonId}`);
    const data = await response.json();
    return mapPokemonData(data);
}

function renderVersusTitle() {
    const titleElement = querySelector('#vs-title');
    const firstPokemonName = firstPokemon?.name ?? '_';
    const secondPokemonName = secondPokemon?.name ?? '_';
    titleElement.innerText = `${firstPokemonName} vs ${secondPokemonName}`;
}

function renderPokemonSlot(slotNumber, pokemon) {
    querySelector('#name-' + slotNumber).textContent = pokemon?.name ?? '_';
    querySelector('#hp-' + slotNumber).textContent = pokemon?.hp ?? '_';
    querySelector('#atk-' + slotNumber).textContent = pokemon?.attack ?? '_';

    const pokemonImage = querySelector('#img-' + slotNumber);
    pokemonImage.src = pokemon?.frontSprite ?? '';
    pokemonImage.alt = pokemon?.name ?? '';
    pokemonImage.onmouseenter = () => {
        if (pokemon?.backSprite) pokemonImage.src = pokemon.backSprite
    };
    pokemonImage.onmouseleave = () => {
        if (pokemon?.frontSprite) pokemonImage.src = pokemon.frontSprite
    };
}

function clearBattleResult() {
    querySelector('#result').textContent = '';
    querySelector('#winner-head').textContent = '';
    querySelector('#winner-type').textContent = '';
    querySelector('#same-grid').innerHTML = '';
    querySelector('#same-type').hidden = true;
}

async function chooseNewPokemon() {
    clearBattleResult();
    querySelector('#btn-battle').disabled = true;

    let firstPokemonId = getRandomPokemonId();
    let secondPokemonId = getRandomPokemonId();
    while (firstPokemonId === secondPokemonId) {
        secondPokemonId = getRandomPokemonId();
    }

    try {
        const [firstPokemonData, secondPokemonData] = await Promise.all([
            fetchPokemonById(firstPokemonId),
            fetchPokemonById(secondPokemonId)
        ]);
        firstPokemon = firstPokemonData;
        secondPokemon = secondPokemonData;
        
        renderPokemonSlot(1, firstPokemon);
        renderPokemonSlot(2, secondPokemon);
        renderVersusTitle();

        querySelector('#btn-battle').disabled = !(firstPokemon && secondPokemon);
    } catch (error) {
        console.error(error);
        querySelector('#result').textContent = 'Error fetching pokemon';
    }
}

async function handleBattleClick() {
    if (!firstPokemon || !secondPokemon) return;

    const battleButton = querySelector('#btn-battle');
    const originalButtonText = 'Battle';

    battleButton.disabled = true;

    battleButton.textContent = 'calculating...';
    await sleep(1000);
    battleButton.textContent = 'fighting.';
    await sleep(1000);
    battleButton.textContent = 'fighting..';
    await sleep(1000);
    battleButton.textContent = 'fighting...';
    await sleep(1000);

    battleButton.textContent = originalButtonText;
    battleButton.disabled = false;

    announceWinner();
}

function announceWinner() {
    if (!firstPokemon || !secondPokemon) return;
    
    const resultElement = querySelector('#result');

    if (firstPokemon.attack === secondPokemon.attack) {
        resultElement.textContent = `It's a tie! (${firstPokemon.name} ${firstPokemon.attack} = ${secondPokemon.name} ${secondPokemon.attack})`;
        return;
    }

    const winningPokemon = firstPokemon.attack > secondPokemon.attack ? firstPokemon : secondPokemon;
    resultElement.textContent = `The Winner is: ${winningPokemon.name}!`;
    querySelector('#winner-head').textContent = `${winningPokemon.name}!`;
    querySelector('#winner-type').textContent = `Type: ${winningPokemon.typeName}`;

    loadSameTypePokemon(winningPokemon).catch(console.error);
}

async function loadSameTypePokemon(winningPokemon) {
    const response = await fetch(TYPE_API(winningPokemon.typeName));
    if (!response.ok) return;
    const typeData = await response.json();

    const candidatePokemon = (typeData.pokemon ?? [])
        .map(entry => entry.pokemon)
        .filter(pokemon => pokemon?.name && pokemon.name !== winningPokemon.name);

    shuffleArray(candidatePokemon);
    const selectedPokemon = candidatePokemon.slice(0, 3);

    const pokemonDetails = await Promise.all(
        selectedPokemon.map(pokemon => 
            fetch(pokemon.url)
                .then(response => response.json())
                .catch(() => null)
        )
    );

    const gridContainer = querySelector('#same-grid');
    gridContainer.innerHTML = '';
    
    pokemonDetails.filter(Boolean).forEach(pokemonData => {
        const pokemonImage = document.createElement('img');
        pokemonImage.src = pokemonData.sprites?.front_default ?? '';
        pokemonImage.alt = pokemonData.name;
        gridContainer.appendChild(pokemonImage);
    });

    if (gridContainer.children.length > 0) {
        querySelector('#same-type').hidden = false;
    }
}

function shuffleArray(array) {
    for (let currentIndex = array.length - 1; currentIndex > 0; currentIndex--) {
        const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}

querySelector('#btn-start').addEventListener('click', chooseNewPokemon);
querySelector('#btn-battle').addEventListener('click', handleBattleClick);
chooseNewPokemon()