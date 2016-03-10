import { Promise } from 'es6-promise'; 
import FileContents from '../models/file-contents';
import path = require('path');
import util = require('util');

const supportedDateFields = ['created', 'createDate', 'creationDate', 'date'];

function tryParse(text:string) {
  try {
    return JSON.parse(text);
  }
  catch (err) {
    return null;
  }
}

export function isJSON(file:FileContents): any {
  if (file.contentType === 'application/json') {
    return tryParse(file.contents);
  }
  let extension = path.extname(file.key).toLowerCase();
  switch (extension) {
    case '.js':
    case '.json':
      return tryParse(file.contents);
    default:
      return null;
  }
}

export function getDate(a): Date {
  for (let i = 0; i < supportedDateFields.length; i++) {
    let key = supportedDateFields[i];
    let test = a[key];
    if (test) {
      return test;
    }
  }
  return null;
}

export function jsonCompare(a, b): number {
  let aDate = getDate(a);
  let bDate = getDate(b);
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

export function sortJSON(files: FileContents[]): any[] {
  let allJSON = true;
  let lines = files.reduce((result, row) => {
    if (!result) {
      return result;
    }
    let json = isJSON(row);
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

export default function sortContents(files: FileContents[]): string | Promise<string> {
  let json = sortJSON(files);
  if (!!json) {
    return JSON.stringify(json);
  }

  let lines = files.reduce((result, row) => {
    let rowLines = row.contents.split('\n')
      .filter((row) => {
        return !!row;
      });
    return result.concat(rowLines);
  }, []);
  lines.sort();
  return lines.join('\n');
}
