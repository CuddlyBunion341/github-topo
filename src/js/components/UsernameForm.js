import { Button, Input } from "@nextui-org/react";

export default class UsernameForm {
  constructor(onSubmit, initialUsername = '') {
    this.onSubmit = onSubmit;
    this.username = initialUsername;
    this.element = this.createFormElement();
    this.setupEventListeners();
  }

  createFormElement() {
    // Create container for the form
    const container = document.createElement('div');
    container.className = 'absolute top-20 right-6 z-10 bg-primary p-4 rounded-xl shadow-lg w-80';
    
    // Create form title
    const title = document.createElement('h2');
    title.textContent = 'GitHub Username';
    title.className = 'text-lg font-semibold mb-3 text-center text-color';
    container.appendChild(title);
    
    // Create form element
    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';
    form.id = 'username-form';
    
    // Add username input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter GitHub username';
    input.className = 'w-full h-10 px-3 rounded-lg';
    input.id = 'username-input';
    input.value = this.username;
    
    form.appendChild(input);
    
    // Add submit button
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Visualize';
    button.className = 'h-10 rounded-lg';
    
    form.appendChild(button);
    container.appendChild(form);

    // Add loading indicator (hidden by default)
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'hidden mt-2 text-center text-color text-sm';
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.textContent = 'Loading...';
    container.appendChild(loadingIndicator);
    
    return container;
  }

  setupEventListeners() {
    const form = this.element.querySelector('#username-form');
    const input = this.element.querySelector('#username-input');
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = input.value.trim();
      if (username) {
        this.showLoading();
        this.onSubmit(username);
      }
    });
    
    // Update local username value on input
    input.addEventListener('input', (e) => {
      this.username = e.target.value.trim();
    });
  }

  mount(parent) {
    parent.appendChild(this.element);
  }

  unmount() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  setUsername(username) {
    this.username = username;
    const input = this.element.querySelector('#username-input');
    if (input) {
      input.value = username;
    }
  }

  showLoading() {
    const loadingIndicator = this.element.querySelector('#loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hidden');
    }
    
    const button = this.element.querySelector('button');
    if (button) {
      button.disabled = true;
      button.classList.add('opacity-50');
    }
  }

  hideLoading() {
    const loadingIndicator = this.element.querySelector('#loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    const button = this.element.querySelector('button');
    if (button) {
      button.disabled = false;
      button.classList.remove('opacity-50');
    }
  }
} 