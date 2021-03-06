'use strict';

const _ = require('lodash');

const rules = require('./rules');

exports.post = function (req, res, next) {
  req.body.body = req.body.body.trim();
  req.checkBody(_.pick(rules.message, ['body']));

  // prepare and return errors
  let errors = req.validationErrors();


  // check whether the receiver is different from sender
  const isSenderEqualReceiver = req.body.to.username === req.auth.username;

  if (isSenderEqualReceiver) {
    errors = errors || [];
    errors.push({
      param: 'to',
      msg: 'Receiver can\'t be the sender',
      value: req.body.to.username
    });
  }

  const errorOutput = { errors: [] };
  if (_.isArray(errors) && errors.length > 0) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.patch = function (req, res, next) {
  const errors = [];
  if (req.body.hasOwnProperty('read')) {
    // ids don't match
    const idsMatch = req.params.id && req.params.id === req.body.id;
    if (!idsMatch) {
      errors.push('ids in request body and url don\'t match');
    }

    // body contains more attributes than just id and read
    const containsMore = _.difference(Object.keys(req.body), ['id', 'read']).length > 0;

    if (containsMore) {
      errors.push('other attributes shouldn\'t be provided with \'read\'');
    }

    // req.body.read === true
    if (req.body.read !== true) {
      errors.push('Invalid value for the attribute \'read\' provided');
    }
  }

  const errorOutput = { errors: [] };
  if (_.isArray(errors) && errors.length > 0) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};
