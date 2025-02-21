document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const actionButton = document.getElementById('actionButton');
        const downloadCsvButton = document.getElementById('downloadCsvButton');
        const resultsTable = document.getElementById('resultsTable');
        const filenameInput = document.getElementById('filenameInput');

        if (currentTab?.url.includes("://www.google.com/maps/search")) {
            document.getElementById('message').textContent = "Click to scrape Google Maps!";
            actionButton.disabled = false;
            actionButton.classList.add('enabled');
        } else {
            const messageElement = document.getElementById('message');
            messageElement.innerHTML = '<a href="https://www.google.com/maps/search/" target="_blank">Go to Google Maps Search</a>';
            actionButton.style.display = downloadCsvButton.style.display = filenameInput.style.display = 'none';
        }

        actionButton.addEventListener('click', function() {
            console.log("start scrapping.. ");
            chrome.scripting.executeScript({
                target: {tabId: currentTab.id},
                function: scrapeData
            }, (results) => {
                console.log("got ", results);
                updateTable(results[0]?.result || []);
                downloadCsvButton.disabled = !results[0]?.result?.length;
            });
        });

        downloadCsvButton.addEventListener('click', () => {
            const csv = tableToCsv(resultsTable);
            const filename = filenameInput.value.trim() || 'google-maps-data.csv';
            downloadCsv(csv, filename.replace(/[^a-z0-9]+/gi, '_') + '.csv');
        });
    });
});

function scrapeData() {
    const results = [];
    const listings = document.querySelectorAll('div.Nv2PK.THOPZb');
  
    listings.forEach(container => {
      const result = {
        title: container.querySelector('.qBF1Pd.fontHeadlineSmall')?.textContent.trim() || '',
        rating: container.querySelector('.MW4etd')?.textContent.trim() || '',
        reviews: container.querySelector('.UY7F9')?.textContent.replace(/[()]/g, '').trim() || '',
        phone: container.querySelector('.UsdlK')?.textContent.trim() || '',
        address: Array.from(container.querySelectorAll('.W4Efsd span:not([aria-hidden])'))
                  .map(el => el.textContent.trim())
                  .join(' ')
                  .replace(/(Open|Closes)\s⋅\s?/g, ''),
        website: container.querySelector('a[href*="//www.google.com/maps/place"]')?.href || '',
        link: container.querySelector('a.hfpxzc')?.href || '',
        services: Array.from(container.querySelectorAll('.ah5Ghc span'))
                     .map(el => el.textContent.trim())
                     .filter(t => !t.includes('⋅'))
                     .join(', ')
      };
  
      // Clean up address
      result.address = result.address.replace(/(\d+)\s(AM|PM)/, '').trim();
      
      results.push(result);

      console.log("results : ", results);
    });
    console.log("final ", results);
    return results;
  }


function updateTable(data) {
    console.log("updating table data:", data);
const headers = ['Title', 'Rating', 'Reviews', 'Phone', 'Address', 'Website', 'Link', 'Services'];
const table = document.getElementById('resultsTable');

table.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

data.forEach(item => {
    const row = document.createElement('tr');
    headers.forEach(h => {
        const cell = document.createElement('td');
        const key = h.toLowerCase();
        cell.textContent = item[key] || '';
        row.appendChild(cell);
    });
    table.appendChild(row);
});
}

function tableToCsv(table) {
    console.log("data: ", table);
    return Array.from(table.rows).map(row => 
        Array.from(row.cells).map(cell => 
            `"${cell.textContent.replace(/"/g, '""')}"`
        ).join(',')
    ).join('\n');
}

function downloadCsv(csv, filename) {
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}