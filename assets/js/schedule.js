let error_toast = function(msg, classes='red darken-1', out_duration=500) {
  M.toast({
    html: msg,
    classes : classes,
    outDuration : out_duration
  });
};

window.addEventListener('DOMContentLoaded', function() {

  const request_json = new XMLHttpRequest();
  const request_api = new XMLHttpRequest();

  const sidenav = document.querySelectorAll('.sidenav');
  const sidenav_instances = M.Sidenav.init(sidenav);

  const modal = document.querySelectorAll('.modal');
  const modal_instances = M.Modal.init(modal);

  const collapsible = document.querySelectorAll('.collapsible');
  const collapsible_instances = M.Collapsible.init(collapsible);

  const select_api = document.getElementById('select_api');
  let select_instance = M.FormSelect.init(select_api);

  const cb_twelveHour = document.getElementById('cb_twelveHour');
  const cb_manualInput = document.getElementById('cb_manualInput');

  let b_twelveHour = localStorage.getItem('twelveHour');
  let b_manualInput = localStorage.getItem('manualInput');

  if(b_twelveHour != null) {
    cb_twelveHour.checked = (b_twelveHour === 'true');
  }

  if(b_manualInput != null) {
    cb_manualInput.checked = (b_manualInput === 'true');
  }

  localStorage.setItem('twelveHour', cb_twelveHour.checked);
  localStorage.setItem('manualInput', cb_manualInput.checked);

  const timepicker = document.getElementById('timepicker');
  let tp_options = { twelveHour : (b_twelveHour === 'true') };
  let tp_instance = cb_manualInput.checked ? null : M.Timepicker.init(timepicker, tp_options);
  // https://github.com/Dogfalo/materialize/issues/6088

  cb_twelveHour.addEventListener('change', function(){
    localStorage.setItem('twelveHour', cb_twelveHour.checked);
    if(tp_instance) {
      tp_options.twelveHour = cb_twelveHour.checked;
      tp_instance = M.Timepicker.init(timepicker, tp_options);
    }
  }, false);

  cb_manualInput.addEventListener('change', function(){
    localStorage.setItem('manualInput', cb_manualInput.checked);
    if(cb_manualInput.checked && tp_instance) {
      tp_instance.destroy();
      tp_instance = null;
    } else if(!cb_manualInput.checked && !tp_instance) {
      tp_options.twelveHour = cb_twelveHour.checked;
      tp_instance = M.Timepicker.init(timepicker, tp_options);
    }
  }, false);

  let registered_items = document.querySelectorAll('.registered-item');
  registered_items.forEach((registered_item) => {
    registered_item.addEventListener('click', function(){
      registered_item.classList.toggle('active');
    }, false);
  });

  let api_url = {
    'living' : '',
    'middle' : '',
    'bedroom' : ''
  };

  request_json.open('GET','./api_config.json');
  request_json.responseType = 'json';
  request_json.send();
  request_json.onload = function() {
    const config_json = request_json.response;

    api_url['living'] = `http://${config_json['living']['server_address']}:${config_json['living']['server_port']}/api/`;
    api_url['middle'] = `http://${config_json['middle']['server_address']}:${config_json['middle']['server_port']}/api/`;
    api_url['bedroom'] = `http://${config_json['bedroom']['server_address']}:${config_json['bedroom']['server_port']}/api/`;

    const option_list = {
      'og_living' : config_json['living']['api_id'],
      'og_middle' : config_json['middle']['api_id'],
      'og_bedroom' : config_json['bedroom']['api_id']
    };

    Object.keys(option_list).forEach((optgroup_id) => {
      const optgroup = document.getElementById(optgroup_id);
      option_list[optgroup_id].forEach((api_id) => {
        let option = document.createElement('option');
        option.setAttribute('value', api_id);
        option.setAttribute('id', 'opt_' + api_id);
        option.innerText = api_id;
        optgroup.appendChild(option);
      });
    });
    // update materialize's select module
    select_instance = M.FormSelect.init(select_api);
  }

  const btn_regist = document.getElementById('btn_regist');

  btn_regist.addEventListener('click', function(){
    const tp_value = timepicker.value;
    if((tp_instance && !tp_value) || (cb_manualInput.checked && !tp_value)) {
      error_toast('Must fill in the Select Time');
      return /* void */;
    }
    const time_patterns = [
      new RegExp(/^(\d{2}:\d{2})( )(AM|PM)$/),
      new RegExp(/^(\d{2}:\d{2})$/),
      new RegExp(/^(\d{2}:\d{2}:\d{2})$/)
    ];
    if(!time_patterns[0].test(tp_value) && !time_patterns[1].test(tp_value) && !time_patterns[2].test(tp_value)) {
      error_toast('follow format HH:MM:SS or HH:MM or HH:MM AM|PM');
      return /* void */;
    }
    // tp_instance.hours, tp_instance.minutes を使用すると
    // manual_input と実装が分離するので tp_value をパースする
    let hours = parseInt(tp_value.substr(0, 2));
    let minutes = parseInt(tp_value.substr(3, 2));
    let seconds = 0;
    if(time_patterns[0].test(tp_value)) {
      const amOrPm = tp_value.substr(6, 2);
      if(amOrPm == 'PM' && hours != 12) hours += 12;
    }
    if(time_patterns[2].test(tp_value)) {
      seconds = parseInt(tp_value.substr(6, 2));
    }

    if((hours < 0 || 23 < hours) || (minutes < 0 || 59 < minutes) || (seconds < 0 || 59 < seconds)) {
      error_toast('invalid time format');
      return /* void */;
    }
    const hours_str = hours.toString().length == 1 ? '0' + hours.toString() : hours.toString();
    const minutes_str = minutes.toString().length == 1 ? '0' + minutes.toString() : minutes.toString();
    const seconds_str = seconds.toString().length == 1 ? '0' + seconds.toString() : seconds.toString();
    // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Template_literals
    const time_str = `${hours_str}:${minutes_str}:${seconds_str}`;

    const optgroup = document.getElementById('opt_' + select_api.value).parentNode;
    const query = `?api_uri=${api_url[optgroup.label]}${select_api.value}&time=${time_str}`;
    console.log(query);
    request_api.open('GET',`https://home.nabetta.com/api/schedule/regist${query}`);
    request_api.responseType = ''; // text

    request_api.send();
    request_api.onreadystatechange = function() {
      if (request_api.readyState === 4 && request_api.status === 200) {
        console.log(request_api.responseText);
      }
    }
  }, false);

  const btn_renew = document.getElementById('btn_renew');
  const btn_delete = document.getElementById('btn_delete');

  btn_renew.addEventListener('click', function(){
    registered_items.forEach((registered_item) => {
      registered_item.classList.remove('active');
    });
  }, false);

  btn_delete.addEventListener('click', function(){

  }, false);

}, false);
