"use strict";

const fs = require('fs');
const path = require('path');

let root = path.dirname(__filename);
let sources = root + '/src';
let template = root + '/src/plugin.js';
let target = root + '/dist/plugin.js';

let replacements = {};

/**
 * Load source files
 */
fs.readdirSync(sources).forEach(file => {
    let data = fs.readFileSync(sources + '/' + file, 'utf8');
    replacements['plugin-src.' + file] = JSON.stringify(data);

    // Add content of file as comment, with tabs before each line
    replacements['/* src: ' + file + ' */'] = data.replace(/\n/g, '\n        ').trim();
});

/**
 * Load JSON files
 */
['manifest', 'package'].forEach(prefix => {
    let data = fs.readFileSync(root + '/' + prefix + '.json', 'utf8');
    data = JSON.parse(data);

    Object.keys(data).forEach(key => {
        if (typeof data[key] === 'object') {
            return;
        }
        replacements['plugin-' + prefix + '.' + key] = JSON.stringify(data[key]);
        replacements['/* ' + prefix + ': ' + key + ' */'] = data[key];
    });
});

/**
 * Load template and replace data
 */
let content = fs.readFileSync(template, 'utf8');

Object.keys(replacements).forEach(search => {
    let replace = replacements[search],
        index;

    while ((index = content.indexOf(search)) !== -1) {
        content = content.replace(search, replace);
    }
});

/**
 * Look for items that weren't replaced
 */
let test = /plugin-[a-zA-Z0-9._-]+/g,
    matches;

while ((matches = test.exec(content)) !== null) {
    console.error('Missing replacement for:', matches[0]);
}

fs.writeFileSync(target, content, 'utf8');
console.log('Saved', target.replace(root + '/', ''), '(' + content.length + ' bytes)');
