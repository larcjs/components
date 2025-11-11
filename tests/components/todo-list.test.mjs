/**
 * todo-list component tests
 * Tests the TodoList web component for rendering, user interaction, and PAN message integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage, waitForPanMessage } from '../lib/test-utils.mjs';

describe('todo-list', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('loads and registers custom element', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('pan-bus') !== undefined);
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    const elementExists = await page.evaluate(() => {
      return document.querySelector('todo-list') !== null;
    });

    expect(elementExists).toBeTruthy();
  });

  test('renders shadow DOM with form and empty state', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    const shadowContent = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const form = todoList.shadowRoot.querySelector('form');
      const input = todoList.shadowRoot.querySelector('#title');
      const button = todoList.shadowRoot.querySelector('button[type="submit"]');
      const emptyMessage = todoList.shadowRoot.querySelector('.muted');

      return {
        hasForm: form !== null,
        hasInput: input !== null,
        hasButton: button !== null,
        emptyText: emptyMessage ? emptyMessage.textContent : null,
        inputPlaceholder: input ? input.placeholder : null,
        buttonText: button ? button.textContent : null
      };
    });

    expect(shadowContent.hasForm).toBeTruthy();
    expect(shadowContent.hasInput).toBeTruthy();
    expect(shadowContent.hasButton).toBeTruthy();
    expect(shadowContent.emptyText).toBe('No tasks yet.');
    expect(shadowContent.inputPlaceholder).toBe('Add a task…');
    expect(shadowContent.buttonText).toBe('Add');
  });

  test('publishes todos.change message when adding a task', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Set up listener for todos.change message
    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.change') {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail);
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Fill in the form and submit
    await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const input = todoList.shadowRoot.querySelector('#title');
      const form = todoList.shadowRoot.querySelector('form');

      input.value = 'Test Task';
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    const message = await messagePromise;

    expect(message.topic).toBe('todos.change');
    expect(message.data.item.title).toBe('Test Task');
    expect(message.data.item.done).toBe(false);
    expect(message.data.item.id).toBeTruthy();
  });

  test('clears input field after submitting a task', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    const inputValue = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const input = todoList.shadowRoot.querySelector('#title');
      const form = todoList.shadowRoot.querySelector('form');

      input.value = 'Another Task';
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      return input.value;
    });

    expect(inputValue).toBe('');
  });

  test('does not submit empty tasks', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    let messageReceived = false;

    await page.evaluate(() => {
      window.testMessageReceived = false;
      const handler = (e) => {
        if (e.detail.topic === 'todos.change') {
          window.testMessageReceived = true;
        }
      };
      document.addEventListener('pan:deliver', handler);
    });

    // Try to submit with empty value
    await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const input = todoList.shadowRoot.querySelector('#title');
      const form = todoList.shadowRoot.querySelector('form');

      input.value = '   '; // Only whitespace
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    });

    await page.waitForTimeout(200);

    messageReceived = await page.evaluate(() => window.testMessageReceived);

    expect(messageReceived).toBe(false);
  });

  test('renders todo items from todos.state', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish todos state
    await publishPanMessage(page, 'todos.state', {
      items: [
        { id: '1', title: 'First Task', done: false },
        { id: '2', title: 'Second Task', done: true }
      ]
    }, { retain: true });

    await page.waitForTimeout(200);

    const renderedItems = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const listItems = todoList.shadowRoot.querySelectorAll('li');

      return Array.from(listItems).map(li => ({
        id: li.dataset.id,
        text: li.querySelector('.t').textContent,
        isDone: li.classList.contains('done'),
        isChecked: li.querySelector('input[type="checkbox"]').checked
      }));
    });

    expect(renderedItems).toHaveLength(2);
    expect(renderedItems[0].id).toBe('1');
    expect(renderedItems[0].text).toBe('First Task');
    expect(renderedItems[0].isDone).toBe(false);
    expect(renderedItems[1].id).toBe('2');
    expect(renderedItems[1].text).toBe('Second Task');
    expect(renderedItems[1].isDone).toBe(true);
    expect(renderedItems[1].isChecked).toBe(true);
  });

  test('publishes todos.toggle when checkbox is clicked', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish initial state
    await publishPanMessage(page, 'todos.state', {
      items: [{ id: 'toggle-1', title: 'Toggle Me', done: false }]
    }, { retain: true });

    await page.waitForTimeout(200);

    // Set up listener for toggle message
    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.toggle') {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail);
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Click checkbox
    await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const checkbox = todoList.shadowRoot.querySelector('input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const message = await messagePromise;

    expect(message.topic).toBe('todos.toggle');
    expect(message.data.id).toBe('toggle-1');
    expect(message.data.done).toBe(true);
  });

  test('publishes todos.remove when delete button is clicked', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish initial state
    await publishPanMessage(page, 'todos.state', {
      items: [{ id: 'delete-1', title: 'Delete Me', done: false }]
    }, { retain: true });

    await page.waitForTimeout(200);

    // Set up listener for remove message
    const messagePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          if (e.detail.topic === 'todos.remove') {
            document.removeEventListener('pan:deliver', handler);
            resolve(e.detail);
          }
        };
        document.addEventListener('pan:deliver', handler);
      });
    });

    // Click delete button
    await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const deleteBtn = todoList.shadowRoot.querySelector('.del');
      deleteBtn.click();
    });

    const message = await messagePromise;

    expect(message.topic).toBe('todos.remove');
    expect(message.data.id).toBe('delete-1');
  });

  test('escapes HTML in todo titles', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish state with HTML content
    await publishPanMessage(page, 'todos.state', {
      items: [{ id: '1', title: '<script>alert("xss")</script>', done: false }]
    }, { retain: true });

    await page.waitForTimeout(200);

    const escapedContent = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const titleSpan = todoList.shadowRoot.querySelector('.t');
      return {
        innerHTML: titleSpan.innerHTML,
        textContent: titleSpan.textContent
      };
    });

    expect(escapedContent.innerHTML).toContain('&lt;script&gt;');
    expect(escapedContent.innerHTML).toContain('&lt;/script&gt;');
    expect(escapedContent.textContent).toBe('<script>alert("xss")</script>');
  });

  test('applies strikethrough style to completed tasks', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish state with completed task
    await publishPanMessage(page, 'todos.state', {
      items: [{ id: '1', title: 'Completed Task', done: true }]
    }, { retain: true });

    await page.waitForTimeout(200);

    const hasDoneClass = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      const listItem = todoList.shadowRoot.querySelector('li');
      return listItem.classList.contains('done');
    });

    expect(hasDoneClass).toBeTruthy();
  });

  test('updates UI when todos.state changes', async () => {
    await page.goto(fileUrl('examples/02-todos-and-inspector.html'));
    await page.waitForFunction(() => customElements.get('todo-list') !== undefined);

    // Publish initial state
    await publishPanMessage(page, 'todos.state', {
      items: [{ id: '1', title: 'First', done: false }]
    }, { retain: true });

    await page.waitForTimeout(200);

    let itemCount = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      return todoList.shadowRoot.querySelectorAll('li').length;
    });

    expect(itemCount).toBe(1);

    // Update state with more items
    await publishPanMessage(page, 'todos.state', {
      items: [
        { id: '1', title: 'First', done: false },
        { id: '2', title: 'Second', done: false },
        { id: '3', title: 'Third', done: false }
      ]
    }, { retain: true });

    await page.waitForTimeout(200);

    itemCount = await page.evaluate(() => {
      const todoList = document.querySelector('todo-list');
      return todoList.shadowRoot.querySelectorAll('li').length;
    });

    expect(itemCount).toBe(3);
  });
});
