var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var _ = require('lodash');
var assert = require('assert');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;


describe("app", function() {
    describe("for service rating use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoServiceRating();
            go.utils.get_timestamp = function() {
                return '20130819144811';
            };

            tester = new AppTester(app);

            tester
                .setup(function(api) {
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);
                    api.groups.add( {
                        key: 'en_key',
                        name: 'en',
                    });
                })
                .setup.char_limit(160)
                .setup.config.app({
                    name: 'servicerating',
                    testing: 'true',
                    env: 'test',
                    conversation_key: 'dummyconversationkey',
                    metric_store: 'test_metric_store',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*8864*1463#",
                    rating_store: {
                        username: 'test_user',
                        api_key: 'test_key',
                        url: 'http://servicerating-store/api/v1/'
                    }
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user starts a session", function() {
            it("should ask for their friendliness rating", function() {
                return tester
                    .setup.user.addr('27001')
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            extra : {
                                language_choice: 'zu'
                            }
                        });
                    })
                    .start()
                    .check.interaction({
                        state: 'question_1_friendliness',
                        reply: [
                            'Welcome. When you signed up, were staff at the facility friendly & helpful?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .check.user.properties({lang: 'zu'})
                    .run();
            });
        });

        describe("when the user answers their friendliness rating", function() {
            it("should ask for their waiting times feeling", function() {
                return tester
                    .setup.user.addr('27001')
                    .setup.user.state('question_1_friendliness')
                    .input('1')
                    .check.interaction({
                        state: 'question_2_waiting_times_feel',
                        reply: [
                            'How do you feel about the time you had to wait at the facility?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times feeling", function() {
            it("should ask for their waiting times length feeling", function() {
                return tester
                    .setup.user.addr('27001')
                    .setup.user.state('question_2_waiting_times_feel')
                    .input('1')
                    .check.interaction({
                        state: 'question_3_waiting_times_length',
                        reply: [
                            'How long did you wait to be helped at the clinic?',
                            '1. Less than an hour',
                            '2. Between 1 and 3 hours',
                            '3. More than 4 hours',
                            '4. All day'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user answers their waiting times length feeling", function() {
            it("should ask for their cleanliness rating", function() {
                return tester
                    .setup.user.addr('27001')
                    .setup.user.state('question_3_waiting_times_length')
                    .input('1')
                    .check.interaction({
                        state: 'question_4_cleanliness',
                        reply: [
                            'Was the facility clean?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user answers their cleanliness rating", function() {
            it("should ask for their privacy rating", function() {
                return tester
                    .setup.user.addr('27001')
                    .setup.user.state('question_4_cleanliness')
                    .input('1')
                    .check.interaction({
                        state: 'question_5_privacy',
                        reply: [
                            'Did you feel that your privacy was respected by the staff?',
                            '1. Very Satisfied',
                            '2. Satisfied',
                            '3. Not Satisfied',
                            '4. Very unsatisfied'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user answers their privacy rating", function() {
            it("should thank and end", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            created_at: "2014-07-28 09:35:26.732",
                            key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                            user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                        });
                    })
                    .setup.user.addr('27001')
                    .setup.user.state('question_5_privacy')
                    .setup.user.answers({
                        'question_1_friendliness': 'very-satisfied',
                        'question_2_waiting_times_feel': 'very-satisfied',
                        'question_3_waiting_times_length': 'less-than-an-hour',
                        'question_4_cleanliness': 'very-satisfied'
                    })
                    .input('1')
                    .check.interaction({
                        state: 'end_thanks',
                        reply: [
                            'Thank you for rating our service.'
                        ].join('\n')
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when the user revisits after rating service previously", function() {
            it("should thank and end", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            created_at: "2014-07-28 09:35:26.732",
                            key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                            user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"                            
                        });
                    })
                    .setup.user.addr('27001')
                    .setup.user.answers({
                        'question_1_friendliness': 'very-satisfied',
                        'question_2_waiting_times_feel': 'very-satisfied',
                        'question_3_waiting_times_length': 'less-than-an-hour',
                        'question_4_cleanliness': 'very-satisfied',
                        'question_5_privacy': 'very-satisfied'
                    })
                    .setup.user.state('end_thanks')
                    .check.interaction({
                        state: 'end_thanks_revisit',
                        reply: 'Sorry, you\'ve already rated service.'
                    })
                    .check.reply.ends_session()
                    .run();
            });

            it("should not send another sms", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            created_at: "2014-07-28 09:35:26.732",
                            key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                            user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"                            
                        });
                    })
                    .setup.user.addr('27001')
                    .setup.user.answers({
                        'question_1_friendliness': 'very-satisfied',
                        'question_2_waiting_times_feel': 'very-satisfied',
                        'question_3_waiting_times_length': 'less-than-an-hour',
                        'question_4_cleanliness': 'very-satisfied',
                        'question_5_privacy': 'very-satisfied'
                    })
                    .setup.user.state('end_thanks')
                    .check.interaction({
                        state: 'end_thanks_revisit',
                        reply: 'Sorry, you\'ve already rated service.'
                    })
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        assert.equal(smses.length, 0);
                    })
                    .check.reply.ends_session()
                    .run();
            });
        });

        describe("when the user answers their privacy rating", function() {
            it("should send them an sms thanking them for their rating", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            created_at: "2014-07-28 09:35:26.732",
                            key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                            user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"                            
                        });
                    })
                    .setup.user.addr('27001')
                    .setup.user.state('question_5_privacy')
                    .setup.user.answers({
                        'question_1_friendliness': 'very-satisfied',
                        'question_2_waiting_times_feel': 'very-satisfied',
                        'question_3_waiting_times_length': 'less-than-an-hour',
                        'question_4_cleanliness': 'very-satisfied'
                    })
                    .input('1')
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        var sms = smses[0];
                        assert.equal(smses.length,1);
                        assert.equal(sms.content,
                            "Thank you for rating our service."
                        );
                        assert.equal(sms.to_addr,'27001');
                    })
                    .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27001'
                            });
                            assert.equal(contact.extra.last_service_rating, '20130819144811');
                        })
                    .check.reply.ends_session()
                    .run();
            });

            it("should use a delegator state to send sms", function() {
                return tester
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27001',
                            created_at: "2014-07-28 09:35:26.732",
                            key: "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                            user_account: "4a11907a-4cc4-415a-9011-58251e15e2b4"
                        });
                    })
                    .setup.user.addr('27001')
                    .setup.user.answers({
                        'question_1_friendliness': 'very-satisfied',
                        'question_2_waiting_times_feel': 'very-satisfied',
                        'question_3_waiting_times_length': 'less-than-an-hour',
                        'question_4_cleanliness': 'very-satisfied',
                        'question_5_privacy': 'very-satisfied'
                    })
                    .setup.user.state('log_servicerating_send_sms')
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        var sms = smses[0];
                        assert.equal(smses.length, 1);
                        assert.equal(sms.content,
                            "Thank you for rating our service."
                        );
                    })
                    .run();
            });
        });
    });
});
