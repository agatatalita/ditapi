'use strict';

module.exports = {
  database: {
    host: '127.0.0.1',
    port: 8529,
    database: 'ditup-dev',
    username: 'ditup-dev',
    password: ''
  },
  url: {
    protocol: 'https',
    host: 'dev.ditup.org',
    path: '/api',
    get all() {
      return `${this.protocol}://${this.host}${this.path}`;
    }
  },
  appUrl: {
    all: 'https://dev.ditup.org',
    verifyEmail: (username, code) => `/user/${username}/verify-email/${code}`,
    resetPassword: (username, code) => `/reset-password/${username}/${code}`
  },
  mailer: {
    host: '0.0.0.0',
    port: 25
  }
};
