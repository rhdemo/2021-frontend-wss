import base from './outgoing.base';

export = base('score-update', {
  delta: {
    type: 'number'
  },
  total: {
    type: 'number'
  }
});
