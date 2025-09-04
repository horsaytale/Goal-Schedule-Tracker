let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const calendar = document.getElementById('calendar');
const yearDeet = document.getElementById('year');
const monthDeet = document.getElementById('month');

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function renderCalendar(month, year) {
  calendar.innerHTML = "";

  // Show current month and year
  yearDeet.innerHTML = `<i class="fa-solid fa-star"></i> ${year} <i class="fa-solid fa-star"></i>`;
  monthDeet.textContent = months[month];

  // Weekday headers
  weekdays.forEach(day => {
    const weekdayCell = document.createElement("div");
    weekdayCell.classList.add("weekday");
    weekdayCell.textContent = day;
    calendar.appendChild(weekdayCell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill in empty days before the 1st
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("day");
    empty.style.background = i==0?"rgb(255, 200, 251)":"transparent";
    empty.style.border = "none";
    calendar.appendChild(empty);
  }


  const icons=['<i class="fa-solid fa-face-laugh-wink"></i>','<i class="fa-solid fa-face-grin-squint-tears"></i>','<i class="fa-solid fa-paw"></i>','<i class="fa-solid fa-bone"></i>','<i class="fa-solid fa-dog"></i>','<i class="fa-solid fa-cat"></i>','<i class="fa-solid fa-ice-cream"></i>','<i class="fa-solid fa-heart"></i>','<i class="fa-solid fa-face-kiss-wink-heart"></i>','<i class="fa-solid fa-rainbow"></i>']
  const colors=['red','lightblue','lightpink','violet', '#ffac9f', 'aqua', 'rgb(241, 135, 255)','rgb(255, 176, 64)','rgb(153, 255, 64)', 'lightsalmon','rgb(255, 88, 197)','rgb(205, 255, 39)','#b6b6b6','blue','orange','green']

  // Fill in actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement("div");
    dayCell.classList.add("day", "filled-day");
    dayCell.textContent = day;

    const dateKey=`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const storageKey=`schedule-${dateKey}`
    const hasData=localStorage.getItem(storageKey)

    if (hasData){
        let icon=localStorage.getItem(`icon-${dateKey}`)
        if(!icon){
            icon=icons[Math.floor(Math.random()*icons.length)]
            localStorage.setItem(`icon-${dateKey}`, icon)
        }
        colorAssigned=colors[Math.floor(Math.random()*colors.length)]
        const iconSpan=document.createElement("span")
        iconSpan.classList.add("day-icon")
        iconSpan.innerHTML=icon
        iconSpan.style.color=colorAssigned
        dayCell.appendChild(iconSpan)
    }

    // Highlight today's date
    if (
      day === currentDate.getDate() &&
      month === currentDate.getMonth() &&
      year === currentDate.getFullYear()
    ) {
      dayCell.classList.add("today");
    }
    calendar.appendChild(dayCell);

    dayCell.addEventListener("click", ()=>{
        const clickedDate=dateKey;
        window.location.href=`schedule.html?date=${clickedDate}`
    })
  }
}

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentMonth, currentYear);
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
});

// Initial render
renderCalendar(currentMonth, currentYear);
