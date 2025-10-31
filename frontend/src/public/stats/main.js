import StatsService from "/utils/stats.js";

const $ = (selector) => document.querySelector(selector);

const statsContainer = $("#stats-container");

async function loadStats() {
  try {
    const stats = await StatsService.all();

    for (const stat of stats) {
      const statElement = document.createElement("div");
      statElement.classList.add("stat-card");
      statElement.innerHTML = `
        <p>${stat.value}</p>
        <h2>${stat.name}</h2>
            `;
      statsContainer.appendChild(statElement);
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadStats);
