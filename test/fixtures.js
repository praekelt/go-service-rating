module.exports = function() {
    return [
      {
        "request": {
          "method": "POST",
          'headers': {
                'Authorization': ['ApiKey test_user:test_key'],
                'Content-Type': ['application/json']
            },
          "url": "http://servicerating-store/api/v1/servicerating/rate/",
          "data": {
            "user_account": "4a11907a-4cc4-415a-9011-58251e15e2b4",
            "conversation_key": "dummyconversationkey",
            "contact": {
                "extra": {},
                "groups": [],
                "subscription": {},
                "msisdn": "+27001",
                "created_at": "2014-07-28 09:35:26.732",
                "key": "63ee4fa9-6888-4f0c-065a-939dc2473a99",
                "user_account": "4a11907a-4cc4-415a-9011-58251e15e2b4",
                "name": null,
                "surname": null,
                "email_address": null,
                "dob": null,
                "twitter_handle": null,
                "facebook_id": null,
                "bbm_pin": null,
                "gtalk_id": null
            },
            "answers": {
                "question_1_friendliness": "very-satisfied",
                "question_2_waiting_times_feel": "very-satisfied",
                "question_3_waiting_times_length": "less-than-an-hour",
                "question_4_cleanliness": "very-satisfied",
                "question_5_privacy": "very-satisfied"
            }
        },
        "response": {
          "code": 201,
          "data": {}
        }
      }
    }
    ];
};
