var go = {};
go;

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

go.app = function() {
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GoServiceRating = App.extend(function(self) {
        App.call(self, 'question_1_friendliness');
        var $ = self.$;

        self.init = function() {
            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');
         
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.states.add('question_1_friendliness', function(name) {
            return go.utils.set_language(self.im.user, self.contact)
                .then(function() {

                    return new ChoiceState(name, {
                        question: $('Welcome. When you signed up, were staff at the facility friendly & helpful?'),

                        choices: [
                            new Choice('very-satisfied', $('Very Satisfied')),
                            new Choice('satisfied', $('Satisfied')),
                            new Choice('not-satisfied', $('Not Satisfied')),
                            new Choice('very-unsatisfied', $('Very unsatisfied'))
                        ],

                        next: 'question_2_waiting_times_feel'
                    });
                    
                });
        });

        self.states.add('question_2_waiting_times_feel', function(name) {
            return new ChoiceState(name, {
                question: $('How do you feel about the time you had to wait at the facility?'),

                choices: [
                    new Choice('very-satisfied', $('Very Satisfied')),
                    new Choice('satisfied', $('Satisfied')),
                    new Choice('not-satisfied', $('Not Satisfied')),
                    new Choice('very-unsatisfied', $('Very unsatisfied'))
                ],

                next: 'question_3_waiting_times_length'
            });
        });

        self.states.add('question_3_waiting_times_length', function(name) {
            return new ChoiceState(name, {
                question: $('How long did you wait to be helped at the clinic?'),

                choices: [
                    new Choice('less-than-an-hour', $('Less than an hour')),
                    new Choice('between-1-and-3-hours', $('Between 1 and 3 hours')),
                    new Choice('more-than-4-hours', $('More than 4 hours')),
                    new Choice('all-day', $('All day'))
                ],

                next: 'question_4_cleanliness'
            });
        });

        self.states.add('question_4_cleanliness', function(name) {
            return new ChoiceState(name, {
                question: $('Was the facility clean?'),

                choices: [
                    new Choice('very-satisfied', $('Very Satisfied')),
                    new Choice('satisfied', $('Satisfied')),
                    new Choice('not-satisfied', $('Not Satisfied')),
                    new Choice('very-unsatisfied', $('Very unsatisfied'))
                ],

                next: 'question_5_privacy'
            });
        });

        self.states.add('question_5_privacy', function(name) {
            return new ChoiceState(name, {
                question: $('Did you feel that your privacy was respected by the staff?'),

                choices: [
                    new Choice('very-satisfied', $('Very Satisfied')),
                    new Choice('satisfied', $('Satisfied')),
                    new Choice('not-satisfied', $('Not Satisfied')),
                    new Choice('very-unsatisfied', $('Very unsatisfied'))
                ],

                next: 'log_servicerating_send_sms'
            });
        });

        self.states.add('log_servicerating_send_sms', function(name) {
            return Q.all([
                go.utils.servicerating_log(self.contact, self.im, self.metric_prefix),
                self.im.outbound.send_to_user({
                        endpoint: 'sms',
                        content: $("Thank you for rating our service.")
                }),
            ])
            .then(function() {
                self.contact.extra.last_service_rating = go.utils.get_timestamp();
                return self.im.contacts.save(self.contact);
            })
            .then(function() {
                return self.states.create('end_thanks');
            });
        });

        self.states.add('end_thanks', function(name) {
            return new EndState(name, {
                text: $('Thank you for rating our service.'),
                next: 'end_thanks_revisit'
            });
        });

        self.states.add('end_thanks_revisit', function(name) {
            return new EndState(name, {
              text: $('Sorry, you\'ve already rated service.'),
              next: 'end_thanks_revisit'
            });
        });

        self.states.add('states_error', function(name) {
            return new EndState(name, {
              text: 'Sorry, something went wrong when saving the data. Please try again.',
              next: 'states_start'
            });
        });

    });

    return {
        GoServiceRating: GoServiceRating
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoServiceRating = go.app.GoServiceRating;


    return {
        im: new InteractionMachine(api, new GoServiceRating())
    };
}();
