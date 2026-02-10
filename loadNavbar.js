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
            <li><a href="risk_calculator.html">Risk calculator</a></li>
            <li><a href="other_calculators.html">Links to other calculators</a></li>
            <li><a href="methodology.html">Methodology</a></li>
            <li><a href="contact.html">Contact</a></li>
        </ul>
    </div>
    </body>
    `;
    const style = document.createElement('style');
    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
});
