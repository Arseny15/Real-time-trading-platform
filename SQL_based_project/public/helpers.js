// a helper function that replaces spaces from the input string with an underscore
function processLabel(str="") {
    return str.trim().split(" ").join("_")
}

/**
 * 
 * Renders checkboxes with the provided labels inside the container of given id
 * 
 * @param {*} containerid 
 * @param {*} labels 
 * @returns 
 */
function renderChecks(containerid, labels) {
    if(!labels || labels.length === 0) {
        console.log("Please provide labels");
        return
    }

    const field = document.getElementById(containerid)
    field.innerHTML = ""
    for(const label of labels) {
        const lblProcessed = processLabel(label)
        const labeltag = document.createElement("label")
        labeltag.innerHTML = `<input type="checkbox" name="${lblProcessed}" value="${lblProcessed}" />${label}`
        field.appendChild(labeltag)
        field.appendChild(document.createElement("br"))
    }
}

/**
 * 
 * Renders the given data using an HTML table inside the container with the given id
 * 
 * @param {*} data 
 * @param {*} cols 
 * @param {*} containerId 
 * @param {*} id 
 */
const renderTable = (data, cols, containerId, id) => {
    const container = document.getElementById(containerId);
    container.innerHTML = ""
    const tableElement = document.createElement("table");
    tableElement.id = `${id}-table`;
    tableElement.border = 2
    tableElement.cellPadding = "5px"
    container.appendChild(tableElement)

    const tableBody = document.createElement('tbody');
    const thead = document.createElement("thead")

    tableElement.appendChild(thead)
    tableElement.appendChild(tableBody)

    cols.forEach((col)=>{
        const th = document.createElement("th")
        th.innerHTML = `<tr>${col}</tr>`
        thead.appendChild(th)
    })

    data.forEach((row)=> {
        const tr = document.createElement("tr")
        row.forEach(item=>{
            const td = document.createElement('td')
            td.innerText = item
            tr.appendChild(td)
        })
        tableBody.appendChild(tr)
    })
}

/**
 * 
 * Returns a list of selected column names
 * 
 * @param {*} fieldsetId 
 * @returns 
 */
const getSelectedColumns  = (fieldsetId) => {
    const field = document.getElementById(fieldsetId)
    const labels = field.querySelectorAll("label");
    return Array.from(labels)
            .filter((label) => label.querySelector("input[type='checkbox']")
            .checked).map((label) => label.textContent.trim());
}

/**
 * 
 * Fetch column names for the given table
 * 
 * @param {*} tableName 
 */
async function fetchColumnNames(tableName="ANALYSABLE_COMPANY_RELEASED_FINANCIALREPORT") {
    const res = await fetch(`/column-names/${tableName}`)
    const data = await res.json()
    return data.columns.flat()
}

/**
 * 
 * Fetches the given columns from the table with the given name
 * 
 * @param {*} tableName 
 * @param {*} cols 
 * @returns 
 */
async function fetchTable(tableName, cols) {
    const res = await fetch(`/table/${tableName}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({cols})
    })
    return await res.json()
}

/**
 * 
 * Renders an interface to add filters
 * 
 * @param {*} colNames 
 */
function addConditionRow(colNames) {
    const conditionContainer = document.getElementById("conditionContainer");
    const conditionGroup = document.createElement("div");
    conditionGroup.classList.add("condition-group");

    conditionGroup.innerHTML = `
        <select class="logic-operator">
            <option value="AND">AND</option>
            <option value="OR">OR</option>
        </select>
        <select class="attribute">
        ${colNames.map(col=>`<option value="${col}">${col}</option>`)}
        </select>
        <select class="comparison-operator">
            <option value="=">=</option>
            <option value="<"><</option>
            <option value=">">></option>
        </select>
        <input type="text" class="value" placeholder="Value" required>
        <button type="button" class="remove-condition-btn">Remove</button>
    `;

    // Attach remove handler
    conditionGroup.querySelector(".remove-condition-btn").addEventListener("click", () => {
        conditionGroup.remove();
    });

    conditionContainer.appendChild(conditionGroup);
}