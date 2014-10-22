go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoServiceRating = go.app.GoServiceRating;


    return {
        im: new InteractionMachine(api, new GoServiceRating())
    };
}();
