export default class Tooltip {
  constructor() {
    this.element = this.createTooltipElement();
    this.visible = false;
  }

  createTooltipElement() {
    const tooltip = document.createElement('div');
    tooltip.className = 
      'hidden fixed z-50 bg-default-50 border border-default-200 shadow-xl rounded-lg p-4 backdrop-blur-md';
    tooltip.style.minWidth = '220px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transform = 'translate(-50%, -120%)';
    
    const title = document.createElement('div');
    title.className = 'font-medium text-default-800 mb-2 text-sm';
    title.id = 'tooltip-date';
    tooltip.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'flex flex-col gap-2';
    
    const count = document.createElement('div');
    count.className = 'flex items-center gap-2';
    
    const countIcon = document.createElement('div');
    countIcon.className = 'tooltip-color-indicator h-4 w-4 rounded-full bg-success-500';
    count.appendChild(countIcon);
    
    const countValue = document.createElement('span');
    countValue.className = 'text-default-700 text-sm font-medium';
    countValue.id = 'tooltip-count';
    count.appendChild(countValue);
    
    content.appendChild(count);
    tooltip.appendChild(content);
    
    document.body.appendChild(tooltip);
    return tooltip;
  }

  show(x, y, data) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    
    const dateEl = this.element.querySelector('#tooltip-date');
    const countEl = this.element.querySelector('#tooltip-count');
    
    // Get the date object
    const date = new Date(data.date);
    
    // Format date as "Weekday, Month Day, Year"
    dateEl.textContent = `${data.dayName || ''}, ${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`;
    
    // Format contribution count
    const count = data.count || 0;
    countEl.textContent = `${count} contribution${count !== 1 ? 's' : ''}`;
    
    // Update color based on contribution level
    const colorEl = this.element.querySelector('.tooltip-color-indicator');
    if (count === 0) {
      colorEl.className = 'tooltip-color-indicator h-4 w-4 rounded-full bg-default-200';
    } else if (count <= 3) {
      colorEl.className = 'tooltip-color-indicator h-4 w-4 rounded-full bg-success-300';
    } else if (count <= 6) {
      colorEl.className = 'tooltip-color-indicator h-4 w-4 rounded-full bg-success-500';
    } else {
      colorEl.className = 'tooltip-color-indicator h-4 w-4 rounded-full bg-success-700';
    }
    
    // Show the tooltip
    this.element.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    this.element.classList.add('hidden');
    this.visible = false;
  }

  dispose() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
    this.element = null;
  }
} 