import { Promise } from 'es6-promise';
import S3Config from '../models/s3-config';
import Format from '../models/format';
import FileContents from '../models/file-contents';
import sorter from '../interfaces/sorter';
import { S3, config as awsConfig, Config, Credentials } from 'aws-sdk';
import util = require('util');
import contentType from '../util/content-type';
import sortContents from '../util/sort-contents';
require('date-format-lite');

export default class S3Consolidator {
  private s3:S3;

  constructor(public config: S3Config) {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
    this.s3 = new S3({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region,
      bucket: config.bucket
    });
  }

  concatonate(keys: string[], sort: sorter = sortContents): Promise<string> {
    return this.downloadAll(keys)
    .then((result) => {
      return sort(result);
    });
  }

  consolidate(keys: string[], 
    consolidatedKey:string,
    format:Format,
    sort: sorter = sortContents,
    acl: string = 'private'): Promise<any> {
    return this.concatonate(keys, sort)
    .then((result) => {
      return this.write(consolidatedKey, format, result, acl);
    })
    .then(() => {
      let keysToDelete = keys.filter((row) => {
        return row !== consolidatedKey;
      });
      return this.deleteAll(keysToDelete);
    });
  }

  private encodeKey(key:string): string {
    return decodeURIComponent(key.replace(/\+/g, " "));
  }

  private downloadAll(keys: string[]): Promise<FileContents[]> {
    let promises = keys.map((key) => {
      return this.download(key);
    });
    return Promise.all(promises);
  }

  private download(key: string): Promise<FileContents> {
    return new Promise((ok, fail) => {
      let args = {
        Bucket: this.config.bucket,
        Key: this.encodeKey(key)
      };
      this.s3.getObject(args, (err, data) => {
        if (err) {
          if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
            return ok(null);
          }
          return fail(err);
        }
        let raw = data.Body.toString();
        ok(new FileContents(key, data.LastModified, data.ContentType, raw));
      });
    });
  }

  private write(key:string, format:Format, contents:string, acl:string): Promise<any> {
    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType(format),
      Body: new Buffer(contents),
      ACL: acl
    };

    return new Promise((ok, fail) => {
      s3.putObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        ok();
      });
    });
  }

  private deleteAll(keys: string[]): Promise<any> {
    let promises = keys.map((key) => {
      return this.deleteKey(key);
    });
    return Promise.all(promises);
  }

  private deleteKey(key: string): Promise<any> {
    return new Promise((ok, fail) => {
      let args = {
        Bucket: this.config.bucket,
        Key: this.encodeKey(key)
      };
      (<any>this.s3).deleteObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        ok();
      });
    });
  }
}
