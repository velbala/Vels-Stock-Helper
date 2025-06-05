// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calc-form');
  const stockPriceInput = document.getElementById('stock-price');
  const customPercentInput = document.getElementById('custom-percent');
  const strategyRadios = document.getElementsByName('strategy');
  const numContractsInput = document.getElementById('num-contracts');
  const outputDiv = document.getElementById('output');

  // Enable/disable custom-percent field based on strategy selection
  strategyRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom' && radio.checked) {
        customPercentInput.disabled = false;
        customPercentInput.focus();
      } else if (radio.value !== 'custom' && radio.checked) {
        customPercentInput.disabled = true;
        customPercentInput.value = '';
      }
    });
  });

  // Form submission handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    outputDiv.innerHTML = ''; // Clear previous output

    // 1. Read inputs
    const stockPrice = parseFloat(stockPriceInput.value);
    if (isNaN(stockPrice) || stockPrice <= 0) {
      outputDiv.textContent = 'Please enter a valid stock price.';
      return;
    }

    let percentDiff = 0;
    let chosenStrategy = '';
    strategyRadios.forEach((radio) => {
      if (radio.checked) {
        chosenStrategy = radio.value;
      }
    });

    switch (chosenStrategy) {
      case 'bullish':
        percentDiff = 2.5;
        break;
      case 'neutral':
        percentDiff = 0;
        break;
      case 'bearish':
        percentDiff = -1.5;
        break;
      case 'custom':
        percentDiff = parseFloat(customPercentInput.value);
        if (isNaN(percentDiff)) {
          outputDiv.textContent = 'Please enter a valid custom percentage.';
          return;
        }
        break;
    }

    const numContracts = parseInt(numContractsInput.value);
    if (isNaN(numContracts) || numContracts < 1) {
      outputDiv.textContent = 'Please enter a valid number of contracts.';
      return;
    }

    // 2. Compute ideal strike
    const idealStrike = parseFloat(
      (stockPrice * (1 + percentDiff / 100)).toFixed(4)
    );

    // 3. Find nearest lower and upper strikes (0.50 intervals)
    const lowerStrike = Math.floor(idealStrike * 2) / 2;
    const upperStrike = Math.ceil(idealStrike * 2) / 2;

    let lowerCount = 0;
    let upperCount = 0;

    if (lowerStrike === upperStrike) {
      // Ideal is exactly on a 0.50 increment → all contracts at that strike
      lowerCount = numContracts;
      upperCount = 0;
    } else {
      // Solve for x so that average is as close to ideal as possible:
      // x = # of lower‐strike contracts. 
      // formula: x = (upper - ideal) / (upper - lower) * n
      const xFloat = ((upperStrike - idealStrike) / (upperStrike - lowerStrike)) * numContracts;
      const xFloor = Math.floor(xFloat);
      const xCeil = Math.ceil(xFloat);

      // Evaluate both floor and ceil to see which yields closer average
      const candidates = [
        { x: xFloor, y: numContracts - xFloor },
        { x: xCeil,  y: numContracts - xCeil  }
      ];

      let best = candidates[0];
      let bestDiff = Math.abs(
        ((candidates[0].x * lowerStrike + candidates[0].y * upperStrike) / numContracts) -
          idealStrike
      );

      for (let i = 1; i < candidates.length; i++) {
        const avg =
          (candidates[i].x * lowerStrike + candidates[i].y * upperStrike) /
          numContracts;
        const diff = Math.abs(avg - idealStrike);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = candidates[i];
        }
      }
      lowerCount = best.x;
      upperCount = best.y;
    }

    // 4. Compute average strike price achieved
    const weightedAvgStrike =
      (lowerCount * lowerStrike + upperCount * upperStrike) / numContracts;

    // 5. Render output
    const frag = document.createDocumentFragment();

    // Ideal strike line
    const idealLine = document.createElement('p');
    idealLine.textContent = `Ideal strike price: \$${idealStrike.toFixed(2)}`;
    frag.appendChild(idealLine);

    // Lower strike line (only if > 0)
    if (lowerCount > 0) {
      const lowerLine = document.createElement('p');
      lowerLine.innerHTML = `<span class="strike-line">Strike \$${lowerStrike.toFixed(
        2
      )}:</span> ${lowerCount} contract${lowerCount > 1 ? 's' : ''}`;
      frag.appendChild(lowerLine);
    }

    // Upper strike line (only if > 0)
    if (upperCount > 0) {
      const upperLine = document.createElement('p');
      upperLine.innerHTML = `<span class="strike-line">Strike \$${upperStrike.toFixed(
        2
      )}:</span> ${upperCount} contract${upperCount > 1 ? 's' : ''}`;
      frag.appendChild(upperLine);
    }

    // Average strike price line
    const avgLine = document.createElement('p');
    avgLine.textContent = `Average strike price: \$${weightedAvgStrike.toFixed(2)}`;
    frag.appendChild(avgLine);

    outputDiv.appendChild(frag);
  });
});