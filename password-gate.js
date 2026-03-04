(function () {
    var KEY = 'uhg_gate';
    var PASS = 'r01ladner';
    var overlay = document.getElementById('password-overlay');
    var gate = document.getElementById('content-gate');
    if (!overlay || !gate) return;

    var input = document.getElementById('gate-password');
    var submit = document.getElementById('gate-submit');
    var error = document.getElementById('gate-error');

    function unlock() {
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        overlay.classList.add('hidden');
        gate.classList.add('unlocked');
    }

    function check() {
        var val = (input && input.value || '').trim();
        if (val === PASS) {
            if (error) error.classList.remove('show');
            unlock();
            return;
        }
        if (error) error.classList.add('show');
        if (input) input.focus();
    }

    if (sessionStorage.getItem(KEY) === '1') {
        unlock();
    } else {
        gate.classList.remove('unlocked');
        overlay.classList.remove('hidden');
    }

    if (submit) submit.addEventListener('click', check);
    if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') check();
    });
})();
