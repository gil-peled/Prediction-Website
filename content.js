document.addEventListener('DOMContentLoaded', (event) => {
    const contentHtml = `
    <div class="light-blue-padding">
        <div class="light-purple-padding">
            <div class="content-wrapper">
                <div class="content-section">
                    <img src="nu-vertical.jpg" alt="Descriptive Text for Image" class="content-image">
                    <div class="divider"></div>
                    <div class="content-text">
                        <p>We recommend that patients use this tool in consultation with their doctor. This tool is only for use in patients who are just diagnosed with a liver cirrhosis.</p>
                        <p>The output from this tool should not be considered clinical advice. The tool is simply designed to convert the findings from the research into an easy-to-use risk calculator.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
    .light-blue-padding {
        background-color: #e6f1fb; /* Light blue */
        padding: 50px 0;
    }
    
    .light-purple-padding {
        background-color: #f2f0fc; /* Light purple */
        padding: 10px 0;
    }
    
    .content-wrapper {
        display: flex;
        justify-content: center;
        padding: 0px;
        width: 100%;
    }
    
    .content-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        width: 100%; /* Stretch content across the page */
        background-color: #f2f0fc; /* White background for content */
        padding: 20px;
        border: 0px dashed #d3d3d3;
    }
    
    .content-image {
        flex: 1;
        max-width: 25%;
        border: 0px dashed #d3d3d3;
        height: auto;
    }
    
    .content-text {
        flex: 1;
        background-color: #f2f0fc; /* Light purple background for text */
        padding: 20px;
        border: 0px dashed #d3d3d3;
    }
    
    .divider {
        width: 5px;
        background-color: #d3d3d3; /* Light gray */
    }
    `;
    document.head.appendChild(style);
    document.querySelector('.main-menu').insertAdjacentHTML('afterend', contentHtml);
});
