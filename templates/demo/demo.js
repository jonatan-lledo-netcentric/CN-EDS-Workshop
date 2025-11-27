export default async function decorate(main) {
  const fragment = document.createRange().createContextualFragment(`
    <div class="demo-template">
      <h2>Demo Template</h2>
      <p>This is a demo template to showcase how to create a new template in this project.</p>
    </div>
  `);
  main.append(fragment);
}
