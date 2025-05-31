// data/store.js
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DATA_DIRECTORY = path.join(__dirname, '..', 'data_files'); // Store data files in a 'data_files' subdirectory
const DATA_FILE_NAME = 'app_data.json';
const DATA_FILE_PATH = path.join(DATA_DIRECTORY, DATA_FILE_NAME);

const store = new Map();

// --- Filesystem Helper Functions ---

/**
 * Ensures the data directory exists.
 */
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    try {
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
      console.log(`[Store] Created data directory: ${DATA_DIRECTORY}`);
    } catch (error) {
      console.error(`[Store] Error creating data directory ${DATA_DIRECTORY}:`, error);
      // Depending on the severity, you might want to throw the error or exit
    }
  }
}

/**
 * Loads data from the filesystem into the in-memory store.
 */
function loadDataFromFile() {
  ensureDataDirectory(); // Make sure directory exists before trying to read
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const jsonData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      if (jsonData.trim() === "") {
        console.log('[Store] Data file is empty, starting with an empty store.');
        store.clear();
        return;
      }
      const dataObject = JSON.parse(jsonData);
      store.clear(); // Clear existing in-memory store before loading
      for (const key in dataObject) {
        if (Object.prototype.hasOwnProperty.call(dataObject, key)) {
          store.set(key, dataObject[key]);
        }
      }
      console.log(`[Store] Data loaded successfully from ${DATA_FILE_PATH}`);
    } else {
      console.log(`[Store] No data file found at ${DATA_FILE_PATH}, starting with an empty store.`);
    }
  } catch (error) {
    console.error(`[Store] Error loading data from ${DATA_FILE_PATH}:`, error);
    console.error('[Store] Starting with an empty store due to load error. Please check the data file for corruption if it exists.');
    store.clear(); // Ensure store is empty on error
  }
}

/**
 * Saves the current in-memory store to the filesystem.
 */
function saveDataToFile() {
  ensureDataDirectory(); // Make sure directory exists before trying to write
  try {
    const dataObject = {};
    for (const [key, value] of store.entries()) {
      dataObject[key] = value;
    }
    const jsonData = JSON.stringify(dataObject, null, 2); // Pretty-print JSON with 2-space indent
    
    const tempFilePath = DATA_FILE_PATH + '.tmp';
    fs.writeFileSync(tempFilePath, jsonData, 'utf8');
    fs.renameSync(tempFilePath, DATA_FILE_PATH); // Atomic rename
    // console.log(`[Store] Data saved successfully to ${DATA_FILE_PATH}`); // Can be noisy, uncomment if needed
  } catch (error) {
    console.error(`[Store] Error saving data to ${DATA_FILE_PATH}:`, error);
  }
}

// --- Original Store Functions (Modified for Persistence) ---

/**
 * Persist any value under a string key.
 * @param {string} key
 * @param {*} value
 */
function setData(key, value) {
  store.set(key, value);
  saveDataToFile(); // Persist after setting
}

/**
 * Retrieve any previously-stored value by key.
 * @param {string} key
 * @returns {*} the stored value, or undefined if not set
 */
function getData(key) {
  return store.get(key);
}

/**
 * Atomically read–modify–write a value under `key`.
 * The `updater` receives the previous value (or `initialValue` if not set)
 * and returns the new value to store.
 *
 * @param {string} key
 * @param {(prev: any) => any} updater
 * @param {*} [initialValue]  value to use if key wasn’t set
 * @returns {*} the newly stored value
 */
function updateData(key, updater, initialValue = undefined) {
  const prev = store.has(key) ? store.get(key) : initialValue;
  const next = updater(prev);
  store.set(key, next);
  saveDataToFile(); // Persist after updating
  return next;
}

/**
 * Return a plain object with every key/value pair in the store.
 * Useful for dumping everything in one shot.
 */
function getAllData() {
  const out = {};
  for (const [key, val] of store.entries()) {
    out[key] = val;
  }
  return out;
}

// --- Initialize ---
// Load data from file when the module is first required.
loadDataFromFile();

module.exports = { getData, setData, updateData, getAllData };