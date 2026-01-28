document.addEventListener('DOMContentLoaded', (event) => {
    const navbarHtml = `
    <body>
    <header>
        <div class="header-content">
            <a href="index.html">
                <img src="logo_white.jpg" alt="Logo" class="logo-left">
            </a>
            <img src="nu-vertical.jpg" alt="Nu Logo" class="logo-right">
        </div>
    </header>
    <div class="main-menu">
        <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="prototype_2.html">Prototype 2</a></li>
            <li class="dropdown">
                <a href="javascript:void(0)" class="dropbtn">Other</a>
                <div class="dropdown-content">
                    <a href="fib4_calculator.html">FIB-4</a>
                    <a href="meld_calculator.html">MELD</a>
                </div>
            </li>
            <li class="dropdown">
                <a href="javascript:void(0)" class="dropbtn">Methodology</a>
                <div class="dropdown-content">
                    <a href="methodology.html">Overview</a>
                    <a href="technical_methodology.html">Technical</a>
                </div>
            </li>
            <li><a href="contact.html">Contact</a></li>
        </ul>
    </div>
    </body>
    `;
    const style = document.createElement('style');
    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
});
