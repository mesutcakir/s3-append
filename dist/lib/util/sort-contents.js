"use strict";
var path = require('path');
var util = require('util');
var supportedDateFields = ['created', 'createDate', 'creationDate', 'date'];
function tryParse(text) {
    try {
        return JSON.parse(text);
    }
    catch (err) {
        return null;
    }
}
function isJSON(file) {
    if (file.contentType === 'application/json') {
        return tryParse(file.contents);
    }
    var extension = path.extname(file.key).toLowerCase();
    switch (extension) {
        case '.js':
        case '.json':
            return tryParse(file.contents);
        default:
            return null;
    }
}
exports.isJSON = isJSON;
function getDate(a) {
    for (var i = 0; i < supportedDateFields.length; i++) {
        var key = supportedDateFields[i];
        var test_1 = a[key];
        if (test_1) {
            return test_1;
        }
    }
    return null;
}
exports.getDate = getDate;
function jsonCompare(a, b) {
    var aDate = getDate(a);
    var bDate = getDate(b);
    if (aDate && bDate) {
        if (aDate < bDate) {
            return -1;
        }
        if (aDate > bDate) {
            return 1;
        }
    }
    if (aDate) {
        return -1;
    }
    if (bDate) {
        return 1;
    }
    return 0;
}
exports.jsonCompare = jsonCompare;
function sortJSON(files) {
    var allJSON = true;
    var lines = files.reduce(function (result, row) {
        if (!result) {
            return result;
        }
        var json = isJSON(row);
        if (!json) {
            return null;
        }
        if (!util.isArray(json)) {
            json = [json];
        }
        return result.concat(json);
    }, []);
    if (!lines) {
        return null;
    }
    lines.sort(jsonCompare);
    return lines;
}
exports.sortJSON = sortJSON;
function sortContents(files) {
    var json = sortJSON(files);
    if (!!json) {
        return JSON.stringify(json);
    }
    var lines = files.reduce(function (result, row) {
        var rowLines = row.contents.split('\n')
            .filter(function (row) {
            return !!row;
        });
        return result.concat(rowLines);
    }, []);
    lines.sort();
    return lines.join('\n');
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sortContents;
//# sourceMappingURL=sort-contents.js.map