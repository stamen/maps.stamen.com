function Donate(config){
  this.config = config;
  this.config.development = config.development || false;

  this.paymentForm = document.querySelector('#' + config.formID);
  this.inputs = this.paymentForm.querySelectorAll('input[type=text], input[type=email], input[type=tel]');
  this.button = this.paymentForm.querySelector('input[type=submit]');

  this.states = {
    'show' : 'active',
    'wait' : 'loading'
  };
  this.focusClass = "has-focus";
  this.valueClass = "has-value";

  this.initialize();
}


Donate.prototype.initialize = function(){
  var self = this;

  this.events();

  for (var i = 0; i < this.inputs.length; ++i) {
    var elm = this.inputs[i];
    self.labelHander(this.inputs[i]);
  }

  this.notify('error');
};


Donate.prototype.events = function(){
  var self = this;

  for (var i = 0; i < this.inputs.length; ++i) {
    var elm = this.inputs[i];

    elm.addEventListener('focus', function(e) {
      this.closest('label').classList.add(self.focusClass);
      self.labelHander(this);
    });

    elm.addEventListener('keydown', function(e) {
      self.labelHander(this);
    });

    elm.addEventListener('blur', function(e) {
      this.closest('label').classList.remove(self.focusClass);
      self.labelHander(this);
    });
  }

};


Donate.prototype.labelHander = function(element){
  var self = this;
  var input = element;
  var label = input.closest('label');

  window.setTimeout(function(){
    var hasValue = (input.value.length > 0) ? true : false ;

    if (hasValue) {
      label.classList.add(self.valueClass);
    } else {
      label.classList.remove(self.valueClass);
    }
  }, 10);
};

Donate.prototype.notify = function(status){
  var self = this;
  var notice = document.querySelector('.notice-' + status );

  if (!notice) return;

  var delay = (this.config.development === true) ? 4000 : 2000;

  notice.style.display = 'block';

  window.setTimeout(function(){
    notice.classList.add('show');
    self.button.classList.remove(self.states.wait);

    window.setTimeout(function(){
      notice.classList.remove('show');
      window.setTimeout(function(){
        notice.style.display = 'none';
      }, 310);
    }, delay);
  }, 10);
};

