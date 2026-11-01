// Browser script: calculators and the lead form. No dependencies.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };

  function emi(P, rate, years) {
    var n = years * 12, r = rate / 1200;
    if (!r) return P / n;
    var f = Math.pow(1 + r, n);
    return (P * r * f) / (f - 1);
  }
  function loanForEmi(e, rate, years) {
    var n = years * 12, r = rate / 1200;
    if (!r) return e * n;
    var f = Math.pow(1 + r, n);
    return (e * (f - 1)) / (r * f);
  }
  var num = function (el) { return Math.max(0, parseFloat(el.value) || 0); };

  document.querySelectorAll('[data-calc]').forEach(function (box) {
    var mode = box.getAttribute('data-calc');
    var out = $('.out', box);
    function run() {
      if (mode === 'emi') {
        var P = num($('[name=amount]', box)), rate = num($('[name=rate]', box)), y = num($('[name=years]', box));
        if (!P || !y) { out.innerHTML = ''; return; }
        var e = emi(P, rate, y), total = e * y * 12;
        out.innerHTML =
          '<div class="big">' + inr(e) + '<span> per month</span></div>' +
          '<p>Total interest: <b>' + inr(total - P) + '</b> · Total payment: <b>' + inr(total) + '</b></p>';
      } else {
        var inc = num($('[name=income]', box)), ob = num($('[name=obligations]', box));
        var rt = num($('[name=rate]', box)), yr = num($('[name=years]', box));
        var maxEmi = Math.max(0, inc * 0.5 - ob);
        out.innerHTML = maxEmi && yr
          ? '<div class="big">' + inr(loanForEmi(maxEmi, rt, yr)) + '<span> estimated eligible loan</span></div>' +
            '<p>Assumes lenders allow total EMIs up to about 50% of net monthly income (' + inr(maxEmi) + ' available). Many lenders use a lower limit.</p>'
          : '<p>Enter your income to see an estimate.</p>';
      }
    }
    box.addEventListener('input', run);
    run();
  });

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    var msg = $('.msg', form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = new FormData(form);
      var body = {
        name: (f.get('name') || '').trim(),
        phone: (f.get('phone') || '').replace(/[\s-]/g, '').replace(/^\+?91/, ''),
        city: (f.get('city') || '').trim(),
        amount: parseFloat(f.get('amount')) || 0,
        consent: f.get('consent') === 'on',
        website: f.get('website') || '',
        page: location.pathname
      };
      if (!body.name || !/^[6-9]\d{9}$/.test(body.phone) || !body.consent) {
        msg.textContent = 'Please enter your name, a valid 10-digit mobile number and tick the consent box.';
        return;
      }
      msg.textContent = 'Sending...';
      fetch(window.CALC.worker + '/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function () { form.reset(); msg.textContent = 'Thank you. We will contact you soon.'; })
        .catch(function () { msg.textContent = 'Sorry, something went wrong. Please try again later.'; });
    });
  });
})();
