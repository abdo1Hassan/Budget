// Get elements from the DOM
const budgetForm = document.getElementById('budget-form');
const budgetDisplay = document.getElementById('budget-display');
const budgetTableBody = document.querySelector('#budget-table tbody');
const saveExpensesBtn = document.getElementById('save-expenses');
const addObligationBtn = document.getElementById('add-obligation');
const obligationsContainer = document.getElementById('obligations-container');

// Summary elements
const totalPlannedEl = document.getElementById('total-planned');
const totalActualEl = document.getElementById('total-actual');
const totalRemainingEl = document.getElementById('total-remaining');

// Initialize variables
let budgetEntries = [];
let totalBudget = 0;
let remainingBudget = 0;
let obligations = [];

// Predefined obligations
obligations = [
    { description: 'Girlfriend gift and dinner', amount: 300 },
    { description: 'Trip expenses', amount: 500 }
];

// Function to display obligations in the form
function displayObligations() {
    obligationsContainer.innerHTML = '';
    obligations.forEach((obligation, index) => {
        const obligationDiv = document.createElement('div');
        obligationDiv.classList.add('obligation-entry');

        const descriptionInput = document.createElement('input');
        descriptionInput.type = 'text';
        descriptionInput.placeholder = 'Description';
        descriptionInput.value = obligation.description;
        descriptionInput.addEventListener('input', function () {
            obligation.description = this.value;
        });

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.placeholder = 'Amount (€)';
        amountInput.value = obligation.amount;
        amountInput.addEventListener('input', function () {
            obligation.amount = parseFloat(this.value) || 0;
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', function () {
            obligations.splice(index, 1);
            displayObligations();
        });

        obligationDiv.appendChild(descriptionInput);
        obligationDiv.appendChild(amountInput);
        obligationDiv.appendChild(removeBtn);

        obligationsContainer.appendChild(obligationDiv);
    });
}

// Call displayObligations on load
displayObligations();

// Add new obligation
addObligationBtn.addEventListener('click', function () {
    obligations.push({ description: '', amount: 0 });
    displayObligations();
});

// Function to initialize the budget with pre-inputted values
function initializeBudget() {
    // Get input values
    totalBudget = parseFloat(document.getElementById('total-budget').value);
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);
    const weekdayBudget = parseFloat(document.getElementById('weekday-budget').value);
    const weekendBudget = parseFloat(document.getElementById('weekend-budget').value);

    // Validate dates
    if (startDate > endDate) {
        alert('Start date must be before end date.');
        return;
    }

    // Validate obligations
    for (let obligation of obligations) {
        if (!obligation.description || obligation.amount <= 0) {
            alert('Please enter valid obligation descriptions and amounts.');
            return;
        }
    }

    // Calculate total obligations
    const totalObligations = obligations.reduce((sum, item) => sum + item.amount, 0);
    remainingBudget = totalBudget - totalObligations;

    budgetEntries = [];

    // Insert obligations into budget entries
    obligations.forEach((item) => {
        budgetEntries.push({
            date: '', // Obligations don't have specific dates
            day: item.description,
            plannedBudget: item.amount,
            actualExpense: item.amount, // Start with planned amount
            isObligation: true,
            remainingBudget: remainingBudget.toFixed(2)
        });
    });

    // Calculate the number of days
    const daysCount = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

    // Generate daily budget entries
    for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 0; // 0 = Sunday, 6 = Saturday

        const plannedBudget = isWeekend ? weekendBudget : weekdayBudget;
        const dateString = currentDate.toISOString().split('T')[0];

        budgetEntries.push({
            date: dateString,
            day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            plannedBudget: plannedBudget,
            actualExpense: 0,
            isObligation: false,
            remainingBudget: remainingBudget.toFixed(2)
        });
    }

    // Save initial data to localStorage
    saveDataToLocalStorage();

    // Display the budget table
    renderBudgetTable();
    budgetDisplay.style.display = 'block';
}

// Event listener for budget form submission
budgetForm.addEventListener('submit', function (event) {
    event.preventDefault();
    initializeBudget();
});

// Function to render the budget table
function renderBudgetTable() {
    budgetTableBody.innerHTML = '';

    budgetEntries.forEach((entry, index) => {
        const row = document.createElement('tr');

        // Add class for obligations row
        if (entry.isObligation) {
            row.classList.add('obligations');
        }

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = entry.date || '—'; // Display '—' if no date
        row.appendChild(dateCell);

        // Day or Description
        const dayCell = document.createElement('td');
        dayCell.textContent = entry.day;
        row.appendChild(dayCell);

        // Planned Budget
        const plannedBudgetCell = document.createElement('td');
        plannedBudgetCell.textContent = parseFloat(entry.plannedBudget).toFixed(2);
        row.appendChild(plannedBudgetCell);

        // Actual Expense
        const actualExpenseCell = document.createElement('td');
        const actualExpenseInput = document.createElement('input');
        actualExpenseInput.type = 'number';
        actualExpenseInput.min = '0';
        actualExpenseInput.value = entry.actualExpense;
        actualExpenseInput.addEventListener('input', function () {
            entry.actualExpense = parseFloat(this.value) || 0;
            recalculateBudgets(index);
            saveDataToLocalStorage();
        });
        actualExpenseCell.appendChild(actualExpenseInput);
        row.appendChild(actualExpenseCell);

        // Remaining Budget
        const remainingBudgetCell = document.createElement('td');
        remainingBudgetCell.textContent = entry.remainingBudget;
        row.appendChild(remainingBudgetCell);

        // Highlight negative or positive remaining budget
        if (parseFloat(entry.remainingBudget) < 0) {
            row.classList.add('negative-budget');
            row.classList.remove('positive-budget');
        } else {
            row.classList.add('positive-budget');
            row.classList.remove('negative-budget');
        }

        budgetTableBody.appendChild(row);
    });

    // Update summary
    updateSummary();
}

// Function to recalculate budgets
function recalculateBudgets(changedIndex) {
    let cumulativeSpent = 0;
    let cumulativePlanned = 0;
    remainingBudget = totalBudget;

    // Recalculate actual expenses and remaining budget
    for (let i = 0; i < budgetEntries.length; i++) {
        const entry = budgetEntries[i];
        cumulativeSpent += parseFloat(entry.actualExpense);
        cumulativePlanned += parseFloat(entry.plannedBudget);

        remainingBudget = totalBudget - cumulativeSpent;
        entry.remainingBudget = remainingBudget.toFixed(2);

        // Adjust planned budgets for remaining days if necessary
        if (i > changedIndex && !entry.isObligation) {
            const remainingEntries = budgetEntries.slice(i).filter(e => !e.isObligation);
            const daysLeft = remainingEntries.length;

            // Calculate the total planned budget for remaining days
            let totalPlannedRemaining = remainingEntries.reduce((sum, e) => sum + parseFloat(e.plannedBudget), 0);

            // Adjust daily planned budgets to stay on track
            const newDailyBudget = remainingBudget / daysLeft;
            entry.plannedBudget = newDailyBudget > 0 ? newDailyBudget : 0;

            // Update the planned budget cell in the table
            const row = budgetTableBody.rows[i];
            row.cells[2].textContent = parseFloat(entry.plannedBudget).toFixed(2);
        }

        // Update the remaining budget cell
        const row = budgetTableBody.rows[i];
        row.cells[4].textContent = entry.remainingBudget;

        // Highlight negative or positive remaining budget
        if (parseFloat(entry.remainingBudget) < 0) {
            row.classList.add('negative-budget');
            row.classList.remove('positive-budget');
        } else {
            row.classList.add('positive-budget');
            row.classList.remove('negative-budget');
        }
    }

    // Update summary
    updateSummary();
}

// Function to update the summary section
function updateSummary() {
    const totalPlanned = budgetEntries.reduce((sum, entry) => sum + parseFloat(entry.plannedBudget), 0);
    const totalActual = budgetEntries.reduce((sum, entry) => sum + parseFloat(entry.actualExpense), 0);

    totalPlannedEl.textContent = totalPlanned.toFixed(2);
    totalActualEl.textContent = totalActual.toFixed(2);
    totalRemainingEl.textContent = (totalBudget - totalActual).toFixed(2);
}

// Save data to localStorage
function saveDataToLocalStorage() {
    const dataToSave = {
        budgetEntries,
        totalBudget,
        obligations,
        totalPlanned: totalPlannedEl.textContent,
        totalActual: totalActualEl.textContent,
        totalRemaining: totalRemainingEl.textContent
    };
    localStorage.setItem('budgetData', JSON.stringify(dataToSave));
}

// Load data from localStorage on page load
window.addEventListener('load', function () {
    const savedData = localStorage.getItem('budgetData');
    if (savedData) {
        const {
            budgetEntries: savedEntries,
            totalBudget: savedTotalBudget,
            obligations: savedObligations,
            totalPlanned,
            totalActual,
            totalRemaining
        } = JSON.parse(savedData);

        budgetEntries = savedEntries;
        totalBudget = savedTotalBudget;
        obligations = savedObligations;

        // Set summary values
        totalPlannedEl.textContent = totalPlanned;
        totalActualEl.textContent = totalActual;
        totalRemainingEl.textContent = totalRemaining;

        // Display obligations in the form
        displayObligations();

        budgetDisplay.style.display = 'block';
        renderBudgetTable();
    } else {
        // Initialize budget on first load
        initializeBudget();
    }
});

// Save expenses button
saveExpensesBtn.addEventListener('click', function () {
    saveDataToLocalStorage();
    alert('Expenses saved!');
});
