'use strict';

const utils = require('./utils');

class ContactList {
  constructor(key, contacts = []) {
    this.key = key;
    this._contacts = [];
    this._contacted = new Set();
    this._active = new Set();

    this.add(contacts);
  }

  get closest() {
    return this._contacts[0];
  }

  get active() {
    return this._contacts.filter( contact => this._active.has(contact[0]));
  }

  get uncontacted() {
    return this._contacts.filter( contact => !this._contacted.has(contact[0]));
  }

  add(contacts) {
    let identities = this._contacts.map(c => c[0]);
    let added = [];

    contacts.forEach( contact => {
      if (identities.indexOf(contact[0]) === -1) {
        this._contacts.push(contact);
        identities.push(contact[0]);
        added.push(contact);
      }
    });

    this._contacts.sort(this._identitySort.bind(this));

    return added;
  }

  contacted(contact) {
    this._contacted.add(contact[0]);
  }

  responded(contact) {
    this._active.add(contact[0]);
  }

  _identitySort([aIdentity], [bIdentity]) {
    return utils.compareKeyBuffers(
      Buffer.from(utils.getDistance(aIdentity, this.key), 'hex'),
      Buffer.from(utils.getDistance(bIdentity, this.key), 'hex')
    )
  }

}

module.exports = ContactList;