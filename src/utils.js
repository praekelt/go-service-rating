var moment = require('moment');
var vumigo = require('vumigo_v02');
var Q = require('q');
var HttpApi = vumigo.http.api.HttpApi;


go.utils = {
    // Shared utils lib

    get_timestamp: function() {
        return moment().format("YYYYMMDDhhmmss");
    },

    store_api_call: function (method, payload, endpoint, im) {
        var http = new HttpApi(im, {
          headers: {
            'Content-Type': ['application/json'],
            'Authorization': ['ApiKey ' + im.config.rating_store.username + ':' + im.config.rating_store.api_key]
          }
        });
        switch (method) {
          case "post":
            return http.post(im.config.rating_store.url + endpoint, {
                data: JSON.stringify(payload)
              });
          case "get":
            return http.get(im.config.rating_store.url + endpoint, {
                params: payload
              });
          case "put":
            return http.put(im.config.rating_store.url + endpoint, {
                data: JSON.stringify(payload)
              });
          case "delete":
            return http.delete(im.config.rating_store.url + endpoint);
        }
    },

    servicerating_log: function(contact, im, metric_prefix) {
        var payload = {
            "user_account": contact.user_account,
            "conversation_key": im.config.conversation_key,
            "contact": contact,
            "answers": im.user.answers
        };
        return go.utils
            .store_api_call("post", payload, 'servicerating/rate/', im)
            .then(function(result) {
                var metric;
                if (result.code >= 200 && result.code < 300){
                    metric = (([metric_prefix, "sum", "servicerating_success"].join('.')));
                } else {
                    metric = (([metric_prefix, "sum", "servicerating_failure"].join('.')));
                }
                return im.metrics.fire.inc(metric, {amount: 1});
        });
    },

    set_language: function(user, contact) {
        if (contact.extra.language_choice !== null) {
            return user.set_lang(contact.extra.language_choice);
        } else {
            return Q();
        }
    },

};
