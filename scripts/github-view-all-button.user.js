// ==UserScript==
// @name         Add a "View all" button in GitHub Review
// @description  Adds icon buttons next to the "viewed" counter of a GitHub pull request: one marks every file as viewed, and each saved config marks the files whose path matches its patterns, on click or automatically
// @version      2.0
// @namespace    https://github.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-view-all-button.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-view-all-button.user.js
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'gh-view-all-configs';
    const ROW_ID = 'gh-view-all-row';
    const DIALOG_ID = 'gh-view-all-dialog';
    const STYLE_ID = 'gh-view-all-style';
    const PULL_PATH_PATTERN = /^\/[^/]+\/[^/]+\/pull\/\d+/;
    const DIFF_ID_PATTERN = /^diff-[0-9a-f]{64}$/;
    const COUNTER_PATTERN = /^\d+ ?\/ ?\d+ (files? )?viewed$/i;
    const VIEWED_LABEL_PATTERN = /^viewed$/i;
    const REGEX_PATTERN = /^\/(.+)\/([a-z]*)$/;
    const CLICK_DELAY = 30;
    const DEFAULT_ICON = 'beaker';
    const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

    const ICONS = {
        'eye-closed': ['M.143 2.31a.75.75 0 0 1 1.047-.167l14.5 10.5a.75.75 0 1 1-.88 1.214l-2.248-1.628C11.346 13.19 9.792 14 8 14c-1.981 0-3.67-.992-4.933-2.078C1.797 10.832.88 9.577.43 8.9a1.619 1.619 0 0 1 0-1.797c.353-.533.995-1.42 1.868-2.305L.31 3.357A.75.75 0 0 1 .143 2.31Zm1.536 5.622A.12.12 0 0 0 1.657 8c0 .021.006.045.022.068.412.621 1.242 1.75 2.366 2.717C5.175 11.758 6.527 12.5 8 12.5c1.195 0 2.31-.488 3.29-1.191L9.063 9.695A2 2 0 0 1 6.058 7.52L3.529 5.688a14.207 14.207 0 0 0-1.85 2.244ZM8 3.5c-.516 0-1.017.09-1.499.251a.75.75 0 1 1-.473-1.423A6.207 6.207 0 0 1 8 2c1.981 0 3.67.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.11.166-.248.365-.41.587a.75.75 0 1 1-1.21-.887c.148-.201.272-.382.371-.53a.119.119 0 0 0 0-.137c-.412-.621-1.242-1.75-2.366-2.717C10.825 4.242 9.473 3.5 8 3.5Z'],
        'gear': ['M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z'],
        'plus': ['M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z'],
        'trash': ['M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z'],
        'beaker': ['M5 5.782V2.5h-.25a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 0 1.5H11v3.282l3.666 5.76C15.619 13.04 14.543 15 12.767 15H3.233c-1.776 0-2.852-1.96-1.899-3.458Zm-2.4 6.565a.75.75 0 0 0 .633 1.153h9.534a.75.75 0 0 0 .633-1.153L12.225 10.5h-8.45ZM9.5 2.5h-3V6c0 .143-.04.283-.117.403L4.73 9h6.54L9.617 6.403A.746.746 0 0 1 9.5 6Z'],
        'bug': ['M4.72.22a.75.75 0 0 1 1.06 0l1 .999a3.488 3.488 0 0 1 2.441 0l.999-1a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.775.776c.616.63.995 1.493.995 2.444v.327c0 .1-.009.197-.025.292.408.14.764.392 1.029.722l1.968-.787a.75.75 0 0 1 .556 1.392L13 7.258V9h2.25a.75.75 0 0 1 0 1.5H13v.5c0 .409-.049.806-.141 1.186l2.17.868a.75.75 0 0 1-.557 1.392l-2.184-.873A4.997 4.997 0 0 1 8 16a4.997 4.997 0 0 1-4.288-2.427l-2.183.873a.75.75 0 0 1-.558-1.392l2.17-.868A5.036 5.036 0 0 1 3 11v-.5H.75a.75.75 0 0 1 0-1.5H3V7.258L.971 6.446a.75.75 0 0 1 .558-1.392l1.967.787c.265-.33.62-.583 1.03-.722a1.677 1.677 0 0 1-.026-.292V4.5c0-.951.38-1.814.995-2.444L4.72 1.28a.75.75 0 0 1 0-1.06Zm.53 6.28a.75.75 0 0 0-.75.75V11a3.5 3.5 0 1 0 7 0V7.25a.75.75 0 0 0-.75-.75ZM6.173 5h3.654A.172.172 0 0 0 10 4.827V4.5a2 2 0 1 0-4 0v.327c0 .096.077.173.173.173Z'],
        'checklist': ['M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v7.736a.75.75 0 0 1-1.5 0V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13.274 9.537v-.001l-4.557 4.45a.75.75 0 0 1-1.055-.008l-1.943-1.95a.75.75 0 0 1 1.062-1.058l1.419 1.425 4.026-3.932a.75.75 0 1 1 1.048 1.074ZM4.75 4h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM4 7.75A.75.75 0 0 1 4.75 7h2a.75.75 0 0 1 0 1.5h-2A.75.75 0 0 1 4 7.75Z'],
        'code': ['m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z'],
        'file-code': ['M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-9a.75.75 0 0 1 0-1.5h9a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5H5.75a.25.25 0 0 0-.25.25v2.5a.75.75 0 0 1-1.5 0Zm1.72 4.97a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.47-1.47-1.47-1.47a.75.75 0 0 1 0-1.06ZM3.28 7.78 1.81 9.25l1.47 1.47a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-2-2a.75.75 0 0 1 0-1.06l2-2a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Zm8.22-6.218V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z'],
        'file': ['M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z'],
        'file-directory': ['M0 2.75C0 1.784.784 1 1.75 1H5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.75c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 0 0-.2-.1Z'],
        'file-diff': ['M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z'],
        'package': ['m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z'],
        'dependabot': ['M5.75 7.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm5.25.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5Z', 'M6.25 0h2A.75.75 0 0 1 9 .75V3.5h3.25a2.25 2.25 0 0 1 2.25 2.25V8h.75a.75.75 0 0 1 0 1.5h-.75v2.75a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V9.5H.75a.75.75 0 0 1 0-1.5h.75V5.75A2.25 2.25 0 0 1 3.75 3.5H7.5v-2H6.25a.75.75 0 0 1 0-1.5ZM3 5.75v6.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-6.5a.75.75 0 0 0-.75-.75h-8.5a.75.75 0 0 0-.75.75Z'],
        'image': ['M16 13.25A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75ZM1.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h.94l.03-.03 6.077-6.078a1.75 1.75 0 0 1 2.412-.06L14.5 10.31V2.75a.25.25 0 0 0-.25-.25Zm12.5 11a.25.25 0 0 0 .25-.25v-.917l-4.298-3.889a.25.25 0 0 0-.344.009L4.81 13.5ZM7 6a2 2 0 1 1-3.999.001A2 2 0 0 1 7 6ZM5.5 6a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0Z'],
        'paintbrush': ['M11.134 1.535c.7-.509 1.416-.942 2.076-1.155.649-.21 1.463-.267 2.069.34.603.601.568 1.411.368 2.07-.202.668-.624 1.39-1.125 2.096-1.011 1.424-2.496 2.987-3.775 4.249-1.098 1.084-2.132 1.839-3.04 2.3a3.744 3.744 0 0 1-1.055 3.217c-.431.431-1.065.691-1.657.861-.614.177-1.294.287-1.914.357A21.151 21.151 0 0 1 .797 16H.743l.007-.75H.749L.742 16a.75.75 0 0 1-.743-.742l.743-.008-.742.007v-.054a21.25 21.25 0 0 1 .13-2.284c.067-.647.187-1.287.358-1.914.17-.591.43-1.226.86-1.657a3.746 3.746 0 0 1 3.227-1.054c.466-.893 1.225-1.907 2.314-2.982 1.271-1.255 2.833-2.75 4.245-3.777ZM1.62 13.089c-.051.464-.086.929-.104 1.395.466-.018.932-.053 1.396-.104a10.511 10.511 0 0 0 1.668-.309c.526-.151.856-.325 1.011-.48a2.25 2.25 0 1 0-3.182-3.182c-.155.155-.329.485-.48 1.01a10.515 10.515 0 0 0-.309 1.67Zm10.396-10.34c-1.224.89-2.605 2.189-3.822 3.384l1.718 1.718c1.21-1.205 2.51-2.597 3.387-3.833.47-.662.78-1.227.912-1.662.134-.444.032-.551.009-.575h-.001V1.78c-.014-.014-.113-.113-.548.027-.432.14-.995.462-1.655.942Zm-4.832 7.266-.001.001a9.859 9.859 0 0 0 1.63-1.142L7.155 7.216a9.7 9.7 0 0 0-1.161 1.607c.482.302.889.71 1.19 1.192Z'],
        'typography': ['M6.71 10H2.332l-.874 2.498a.75.75 0 0 1-1.415-.496l3.39-9.688a1.217 1.217 0 0 1 2.302.018l3.227 9.681a.75.75 0 0 1-1.423.474Zm3.13-4.358C10.53 4.374 11.87 4 13 4c1.5 0 3 .939 3 2.601v5.649a.75.75 0 0 1-1.448.275C13.995 12.82 13.3 13 12.5 13c-.77 0-1.514-.231-2.078-.709-.577-.488-.922-1.199-.922-2.041 0-.694.265-1.411.887-1.944C11 7.78 11.88 7.5 13 7.5h1.5v-.899c0-.54-.5-1.101-1.5-1.101-.869 0-1.528.282-1.84.858a.75.75 0 1 1-1.32-.716ZM6.21 8.5 4.574 3.594 2.857 8.5Zm8.29.5H13c-.881 0-1.375.22-1.637.444-.253.217-.363.5-.363.806 0 .408.155.697.39.896.249.21.63.354 1.11.354.732 0 1.26-.209 1.588-.449.35-.257.412-.495.412-.551Z'],
        'book': ['M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z'],
        'database': ['M1 3.5c0-.626.292-1.165.7-1.59.406-.422.956-.767 1.579-1.041C4.525.32 6.195 0 8 0c1.805 0 3.475.32 4.722.869.622.274 1.172.62 1.578 1.04.408.426.7.965.7 1.591v9c0 .626-.292 1.165-.7 1.59-.406.422-.956.767-1.579 1.041C11.476 15.68 9.806 16 8 16c-1.805 0-3.475-.32-4.721-.869-.623-.274-1.173-.62-1.579-1.04-.408-.426-.7-.965-.7-1.591Zm1.5 0c0 .133.058.318.282.551.227.237.591.483 1.101.707C4.898 5.205 6.353 5.5 8 5.5c1.646 0 3.101-.295 4.118-.742.508-.224.873-.471 1.1-.708.224-.232.282-.417.282-.55 0-.133-.058-.318-.282-.551-.227-.237-.591-.483-1.101-.707C11.102 1.795 9.647 1.5 8 1.5c-1.646 0-3.101.295-4.118.742-.508.224-.873.471-1.1.708-.224.232-.282.417-.282.55Zm0 4.5c0 .133.058.318.282.551.227.237.591.483 1.101.707C4.898 9.705 6.353 10 8 10c1.646 0 3.101-.295 4.118-.742.508-.224.873-.471 1.1-.708.224-.232.282-.417.282-.55V5.724c-.241.15-.503.286-.778.407C11.475 6.68 9.805 7 8 7c-1.805 0-3.475-.32-4.721-.869a6.15 6.15 0 0 1-.779-.407Zm0 2.225V12.5c0 .133.058.318.282.55.227.237.592.484 1.1.708 1.016.447 2.471.742 4.118.742 1.647 0 3.102-.295 4.117-.742.51-.224.874-.47 1.101-.707.224-.233.282-.418.282-.551v-2.275c-.241.15-.503.285-.778.406-1.247.549-2.917.869-4.722.869-1.805 0-3.475-.32-4.721-.869a6.327 6.327 0 0 1-.779-.406Z'],
        'lock': ['M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 6V4a2.5 2.5 0 1 0-5 0v2Z'],
        'shield': ['M7.467.133a1.748 1.748 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.956 3.582-2.104 4.366-3.298C13.225 9.666 13.5 8.36 13.5 7V3.48a.251.251 0 0 0-.174-.237l-5.25-1.68ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'],
        'globe': ['M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM5.78 8.75a9.64 9.64 0 0 0 1.363 4.177c.255.426.542.832.857 1.215.245-.296.551-.705.857-1.215A9.64 9.64 0 0 0 10.22 8.75Zm4.44-1.5a9.64 9.64 0 0 0-1.363-4.177c-.307-.51-.612-.919-.857-1.215a9.927 9.927 0 0 0-.857 1.215A9.64 9.64 0 0 0 5.78 7.25Zm-5.944 1.5H1.543a6.507 6.507 0 0 0 4.666 5.5c-.123-.181-.24-.365-.352-.552-.715-1.192-1.437-2.874-1.581-4.948Zm-2.733-1.5h2.733c.144-2.074.866-3.756 1.58-4.948.12-.197.237-.381.353-.552a6.507 6.507 0 0 0-4.666 5.5Zm10.181 1.5c-.144 2.074-.866 3.756-1.58 4.948-.12.197-.237.381-.353.552a6.507 6.507 0 0 0 4.666-5.5Zm2.733-1.5a6.507 6.507 0 0 0-4.666-5.5c.123.181.24.365.353.552.714 1.192 1.436 2.874 1.58 4.948Z'],
        'tools': ['M5.433 2.304A4.492 4.492 0 0 0 3.5 6c0 1.598.832 3.002 2.09 3.802.518.328.929.923.902 1.64v.008l-.164 3.337a.75.75 0 1 1-1.498-.073l.163-3.33c.002-.085-.05-.216-.207-.316A5.996 5.996 0 0 1 2 6a5.993 5.993 0 0 1 2.567-4.92 1.482 1.482 0 0 1 1.673-.04c.462.296.76.827.76 1.423v2.82c0 .082.041.16.11.206l.75.51a.25.25 0 0 0 .28 0l.75-.51A.249.249 0 0 0 9 5.282V2.463c0-.596.298-1.127.76-1.423a1.482 1.482 0 0 1 1.673.04A5.993 5.993 0 0 1 14 6a5.996 5.996 0 0 1-2.786 5.068c-.157.1-.209.23-.207.315l.163 3.33a.752.752 0 0 1-1.094.714.75.75 0 0 1-.404-.64l-.164-3.345c-.027-.717.384-1.312.902-1.64A4.495 4.495 0 0 0 12.5 6a4.492 4.492 0 0 0-1.933-3.696c-.024.017-.067.067-.067.16v2.818a1.75 1.75 0 0 1-.767 1.448l-.75.51a1.75 1.75 0 0 1-1.966 0l-.75-.51A1.75 1.75 0 0 1 5.5 5.282V2.463c0-.092-.043-.142-.067-.159Z'],
    };
    const CONFIG_ICONS = Object.keys(ICONS).filter(name => !['eye-closed', 'gear', 'plus', 'trash'].includes(name));

    const autoHandled = new Set();
    let running = false;
    let scheduled = false;

    function loadConfigs() {
        try {
            const configs = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(configs) ? configs : [];
        } catch {
            return [];
        }
    }

    function saveConfigs(configs) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
        } catch {
            // The configs only live for this page when the storage is unavailable.
        }
    }

    function createIcon(name) {
        const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('aria-hidden', 'true');
        (ICONS[name] || ICONS[DEFAULT_ICON]).forEach(data => {
            const path = document.createElementNS(SVG_NAMESPACE, 'path');
            path.setAttribute('d', data);
            svg.appendChild(path);
        });
        return svg;
    }

    function normalize(text) {
        return text.replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
    }

    function parsePatterns(text) {
        return text.split('\n').map(line => line.trim()).filter(Boolean);
    }

    function toMatcher(pattern) {
        const regex = pattern.match(REGEX_PATTERN);
        if (!regex) {
            return path => path.includes(pattern);
        }
        try {
            const expression = new RegExp(regex[1], regex[2].replace(/[gy]/g, ''));
            return path => expression.test(path);
        } catch {
            return () => false;
        }
    }

    function matchesConfig(config, path) {
        return Boolean(path) && config.patterns.some(pattern => toMatcher(pattern)(path));
    }

    function isViewedControl(element) {
        return VIEWED_LABEL_PATTERN.test(normalize(element.textContent)) && !element.closest(`#${ROW_ID}, #${DIALOG_ID}`);
    }

    function isPressed(element) {
        for (const attribute of ['aria-pressed', 'aria-checked']) {
            if (element.hasAttribute(attribute)) {
                return element.getAttribute(attribute) === 'true';
            }
        }
        const input = element.querySelector('input[type="checkbox"]');
        if (input) {
            return input.checked;
        }
        return Boolean(element.querySelector('.octicon-checkbox-fill, [class*="checkbox-fill"]'));
    }

    function findFileContainer(control) {
        const diff = control.closest('[id^="diff-"]');
        if (diff && DIFF_ID_PATTERN.test(diff.id)) {
            return diff;
        }
        let node = control;
        while (node.parentElement && node.parentElement !== document.body) {
            const siblings = [...node.parentElement.querySelectorAll('button, [role="checkbox"]')].filter(isViewedControl);
            if (siblings.length > 1) {
                return node;
            }
            node = node.parentElement;
        }
        return node;
    }

    function readPath(control) {
        const legacy = control.closest('[data-tagsearch-path]');
        if (legacy) {
            return legacy.getAttribute('data-tagsearch-path');
        }
        const container = findFileContainer(control);
        const named = container.querySelector('[data-path], [data-file-path]');
        if (named) {
            return named.getAttribute('data-path') || named.getAttribute('data-file-path');
        }
        for (const selector of ['h3', '[class*="file-name" i], [class*="filename" i]', 'a[href^="#diff-"]', 'code']) {
            for (const candidate of container.querySelectorAll(selector)) {
                const text = normalize(candidate.textContent);
                if (text && !text.includes(' ') && /[./]/.test(text)) {
                    return text;
                }
            }
        }
        return '';
    }

    function findViewedControls() {
        const legacy = [...document.querySelectorAll('input[type="checkbox"][name="viewed"]')].map(input => ({
            element: input,
            path: readPath(input),
            isViewed: () => input.checked,
        }));
        const modern = [...document.querySelectorAll('button, [role="checkbox"]')]
            .filter(isViewedControl)
            .filter(element => !element.querySelector('input[name="viewed"]'))
            .map(element => ({
                element,
                path: readPath(element),
                isViewed: () => isPressed(element),
            }));
        return [...legacy, ...modern];
    }

    function wait(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    async function clickAll(controls) {
        for (const control of controls) {
            if (control.element.isConnected) {
                control.element.click();
                await wait(CLICK_DELAY);
            }
        }
    }

    async function toggleViewed(predicate) {
        if (running) {
            return;
        }
        const targets = findViewedControls().filter(control => predicate(control.path));
        if (!targets.length) {
            return;
        }
        running = true;
        const allViewed = targets.every(control => control.isViewed());
        try {
            await clickAll(targets.filter(control => control.isViewed() === allViewed));
        } finally {
            running = false;
        }
    }

    function pullRequestKey() {
        const match = location.pathname.match(PULL_PATH_PATTERN);
        return match ? match[0] : '';
    }

    function applyAutoConfigs() {
        if (running) {
            return;
        }
        const autoConfigs = loadConfigs().filter(config => config.auto && config.patterns.length);
        if (!autoConfigs.length) {
            return;
        }
        const toClick = [];
        findViewedControls().forEach(control => {
            const key = `${pullRequestKey()}|${control.path}`;
            if (!control.path || autoHandled.has(key) || !autoConfigs.some(config => matchesConfig(config, control.path))) {
                return;
            }
            autoHandled.add(key);
            if (!control.isViewed()) {
                toClick.push(control);
            }
        });
        if (toClick.length) {
            running = true;
            clickAll(toClick).finally(() => {
                running = false;
            });
        }
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${ROW_ID} {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                margin: 0 8px;
                vertical-align: middle;
            }
            .gh-va-button {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                padding: 0;
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: var(--fgColor-muted, #59636e);
                cursor: pointer;
            }
            .gh-va-button:hover {
                background: var(--bgColor-neutral-muted, rgba(129, 139, 152, 0.15));
                color: var(--fgColor-default, #1f2328);
            }
            .gh-va-button svg {
                fill: currentColor;
            }
            .gh-va-button[data-auto="true"]::after {
                content: '';
                position: absolute;
                top: 4px;
                right: 4px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--fgColor-accent, #0969da);
            }
            .gh-va-separator {
                width: 1px;
                height: 16px;
                margin: 0 4px;
                background: var(--borderColor-default, #d1d9e0);
            }
            #${DIALOG_ID} {
                width: min(560px, calc(100vw - 32px));
                max-height: calc(100vh - 64px);
                padding: 0;
                border: 1px solid var(--borderColor-default, #d1d9e0);
                border-radius: 12px;
                background: var(--bgColor-default, #ffffff);
                color: var(--fgColor-default, #1f2328);
                box-shadow: var(--shadow-floating-large, 0 8px 24px rgba(0, 0, 0, 0.2));
            }
            #${DIALOG_ID}::backdrop {
                background: rgba(0, 0, 0, 0.4);
            }
            .gh-va-dialog-header, .gh-va-dialog-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 12px 16px;
            }
            .gh-va-dialog-header {
                border-bottom: 1px solid var(--borderColor-default, #d1d9e0);
                font-weight: 600;
            }
            .gh-va-dialog-footer {
                border-top: 1px solid var(--borderColor-default, #d1d9e0);
            }
            .gh-va-dialog-body {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px;
                overflow: auto;
                max-height: calc(100vh - 200px);
            }
            .gh-va-hint, .gh-va-empty, .gh-va-matches {
                margin: 0;
                color: var(--fgColor-muted, #59636e);
                font-size: 12px;
            }
            .gh-va-card {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 12px;
                border: 1px solid var(--borderColor-default, #d1d9e0);
                border-radius: 8px;
            }
            .gh-va-card-header {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .gh-va-input, .gh-va-textarea {
                width: 100%;
                padding: 5px 8px;
                border: 1px solid var(--borderColor-default, #d1d9e0);
                border-radius: 6px;
                background: var(--bgColor-default, #ffffff);
                color: inherit;
                font: inherit;
                font-size: 14px;
            }
            .gh-va-textarea {
                min-height: 72px;
                resize: vertical;
                font-family: var(--fontStack-monospace, ui-monospace, SFMono-Regular, Menlo, monospace);
                font-size: 12px;
            }
            .gh-va-icons {
                display: flex;
                flex-wrap: wrap;
                gap: 2px;
            }
            .gh-va-icons .gh-va-button[aria-pressed="true"] {
                background: var(--bgColor-accent-muted, rgba(84, 174, 255, 0.4));
                color: var(--fgColor-accent, #0969da);
            }
            .gh-va-auto {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
            }
            .gh-va-text-button {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                height: 28px;
                padding: 0 12px;
                border: 1px solid var(--borderColor-default, #d1d9e0);
                border-radius: 6px;
                background: var(--bgColor-muted, #f6f8fa);
                color: inherit;
                font: inherit;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
            }
            .gh-va-text-button svg {
                fill: currentColor;
            }
        `;
        document.head.appendChild(style);
    }

    function createIconButton(icon, label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gh-va-button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.appendChild(createIcon(icon));
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            onClick(button);
        });
        return button;
    }

    function createTextButton(icon, label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gh-va-text-button';
        if (icon) {
            button.appendChild(createIcon(icon));
        }
        button.appendChild(document.createTextNode(label));
        button.addEventListener('click', onClick);
        return button;
    }

    function describeConfig(config) {
        const patterns = config.patterns.length ? config.patterns.join(', ') : 'no pattern yet';
        return `${config.name || 'Untitled'}: ${patterns}${config.auto ? ' (auto)' : ''} — click again to unmark`;
    }

    function fillRow(row) {
        row.replaceChildren();
        row.appendChild(createIconButton('eye-closed', 'Mark all files as viewed — click again to unmark', () => toggleViewed(() => true)));
        loadConfigs().forEach(config => {
            const button = createIconButton(config.icon, describeConfig(config), () => toggleViewed(path => matchesConfig(config, path)));
            button.dataset.auto = String(Boolean(config.auto));
            row.appendChild(button);
        });
        const separator = document.createElement('span');
        separator.className = 'gh-va-separator';
        row.appendChild(separator);
        row.appendChild(createIconButton('gear', 'Configure the "mark as viewed" buttons', openDialog));
    }

    function refreshRow() {
        const row = document.getElementById(ROW_ID);
        if (row) {
            fillRow(row);
        }
    }

    function findViewedCounter() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: node => /viewed/i.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
        });
        while (walker.nextNode()) {
            let element = walker.currentNode.parentElement;
            let counter = null;
            while (element && element !== document.body && normalize(element.textContent).length <= 40) {
                if (COUNTER_PATTERN.test(normalize(element.textContent))) {
                    counter = element;
                }
                element = element.parentElement;
            }
            if (counter && !counter.closest(`#${ROW_ID}, #${DIALOG_ID}`)) {
                return counter;
            }
        }
        return null;
    }

    function addRow() {
        if (!PULL_PATH_PATTERN.test(location.pathname) || document.getElementById(ROW_ID)) {
            return;
        }
        const counter = findViewedCounter();
        const legacyBar = counter ? null : document.querySelector('.diffbar.details-collapse');
        if (!counter && !legacyBar) {
            return;
        }
        injectStyle();
        const row = document.createElement('span');
        row.id = ROW_ID;
        fillRow(row);
        if (counter) {
            counter.insertAdjacentElement('afterend', row);
        } else {
            legacyBar.appendChild(row);
        }
    }

    function updateConfig(id, changes) {
        const configs = loadConfigs().map(config => config.id === id ? { ...config, ...changes } : config);
        saveConfigs(configs);
        refreshRow();
        return configs.find(config => config.id === id);
    }

    function countMatches(config) {
        const paths = new Set(findViewedControls().map(control => control.path).filter(Boolean));
        return [...paths].filter(path => matchesConfig(config, path)).length;
    }

    function describeMatches(config) {
        const count = countMatches(config);
        return `${count} file${count === 1 ? '' : 's'} on this page match`;
    }

    function createIconPicker(config, onPick) {
        const picker = document.createElement('div');
        picker.className = 'gh-va-icons';
        CONFIG_ICONS.forEach(icon => {
            const button = createIconButton(icon, icon, () => {
                picker.querySelectorAll('.gh-va-button').forEach(other => other.setAttribute('aria-pressed', 'false'));
                button.setAttribute('aria-pressed', 'true');
                onPick(icon);
            });
            button.setAttribute('aria-pressed', String(icon === config.icon));
            picker.appendChild(button);
        });
        return picker;
    }

    function createConfigCard(config, onDelete) {
        const card = document.createElement('div');
        card.className = 'gh-va-card';

        const header = document.createElement('div');
        header.className = 'gh-va-card-header';
        const name = document.createElement('input');
        name.className = 'gh-va-input';
        name.placeholder = 'Name, e.g. Tests';
        name.value = config.name;
        name.addEventListener('input', () => updateConfig(config.id, { name: name.value.trim() }));
        header.appendChild(name);
        header.appendChild(createIconButton('trash', 'Delete this config', () => {
            if (confirm(`Delete the config "${config.name || 'Untitled'}"?`)) {
                saveConfigs(loadConfigs().filter(other => other.id !== config.id));
                refreshRow();
                onDelete();
            }
        }));

        const patterns = document.createElement('textarea');
        patterns.className = 'gh-va-textarea';
        patterns.placeholder = '__tests__\n.test.ts\n.spec.ts';
        patterns.value = config.patterns.join('\n');

        const matches = document.createElement('p');
        matches.className = 'gh-va-matches';
        matches.textContent = describeMatches(config);
        patterns.addEventListener('input', () => {
            const updated = updateConfig(config.id, { patterns: parsePatterns(patterns.value) });
            matches.textContent = describeMatches(updated);
        });

        const auto = document.createElement('label');
        auto.className = 'gh-va-auto';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(config.auto);
        checkbox.addEventListener('change', () => {
            updateConfig(config.id, { auto: checkbox.checked });
            schedule();
        });
        auto.appendChild(checkbox);
        auto.appendChild(document.createTextNode('Auto: mark matching files as viewed as soon as they appear'));

        card.appendChild(header);
        card.appendChild(createIconPicker(config, icon => updateConfig(config.id, { icon })));
        card.appendChild(patterns);
        card.appendChild(matches);
        card.appendChild(auto);
        return card;
    }

    function fillDialogBody(body) {
        body.replaceChildren();
        const hint = document.createElement('p');
        hint.className = 'gh-va-hint';
        hint.textContent = 'One pattern per line, tested against the full file path. Plain text matches when the path contains it; /…/ is a regular expression, e.g. /\\.(test|spec)\\.ts$/. Each config adds a button next to the "viewed" counter.';
        body.appendChild(hint);
        const configs = loadConfigs();
        if (!configs.length) {
            const empty = document.createElement('p');
            empty.className = 'gh-va-empty';
            empty.textContent = 'No config yet.';
            body.appendChild(empty);
        }
        configs.forEach(config => body.appendChild(createConfigCard(config, () => fillDialogBody(body))));
    }

    function createDialog() {
        const dialog = document.createElement('dialog');
        dialog.id = DIALOG_ID;

        const header = document.createElement('div');
        header.className = 'gh-va-dialog-header';
        header.appendChild(document.createTextNode('Mark-as-viewed configs'));

        const body = document.createElement('div');
        body.className = 'gh-va-dialog-body';

        const footer = document.createElement('div');
        footer.className = 'gh-va-dialog-footer';
        footer.appendChild(createTextButton('plus', 'Add a config', () => {
            const config = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: '', icon: DEFAULT_ICON, patterns: [], auto: false };
            saveConfigs([...loadConfigs(), config]);
            refreshRow();
            fillDialogBody(body);
            body.querySelector('.gh-va-card:last-child .gh-va-input')?.focus();
        }));
        footer.appendChild(createTextButton(null, 'Close', () => dialog.close()));

        dialog.appendChild(header);
        dialog.appendChild(body);
        dialog.appendChild(footer);
        dialog.addEventListener('click', event => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        document.body.appendChild(dialog);
        return dialog;
    }

    function openDialog() {
        injectStyle();
        const dialog = document.getElementById(DIALOG_ID) || createDialog();
        fillDialogBody(dialog.querySelector('.gh-va-dialog-body'));
        dialog.showModal();
    }

    function run() {
        scheduled = false;
        if (!PULL_PATH_PATTERN.test(location.pathname)) {
            return;
        }
        addRow();
        applyAutoConfigs();
    }

    function schedule() {
        if (!scheduled) {
            scheduled = true;
            setTimeout(run, 300);
        }
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    schedule();
})();
