const API = "/blogs";
const $ = id => document.getElementById(id);

function handleBlogSubmit(e) {
  e.preventDefault();
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: $("title").value,
      body: $("body").value,
      author: $("author").value || "Anonymous"
    }),
  })
    .then(res => {
      if (res.ok) {
        alert("Blog Added Successfully!");
        loadPosts();
      } else {
        alert("Error adding blog.");
      }
    })
    .catch(err => alert("Error adding blog."));
  e.target.reset();
}

$("blogForm").onsubmit = handleBlogSubmit;

// Load All Posts (Read)
function loadPosts() {
  fetch(API)
    .then(res => res.json())
    .then(posts => {
      $("posts").innerHTML = posts
        .map(p => `
          <div class="post" id="post-${p._id}">
            <h3>${p.title}</h3>
            <p>${p.body}</p>
            <small>Author: ${p.author}</small>
            <button onclick="deletePost('${p._id}')">Delete</button>
            <button onclick="showEditForm('${p._id}')">Edit</button>
            <div class="edit-form" id="edit-form-${p._id}" style="display:none;">
              <input type="text" id="edit-title-${p._id}" value="${p.title}">
              <textarea id="edit-body-${p._id}">${p.body}</textarea>
              <input type="text" id="edit-author-${p._id}" value="${p.author}">
              <button onclick="editPost('${p._id}')">Save</button>
            </div>
          </div>
        `)
        .join("");
    })
    .catch(err => console.error("Error loading posts:", err));
}

// Delete a Post
function deletePost(id) {
  fetch(`${API}/${id}`, { method: "DELETE" })
    .then(res => {
      if (res.ok) {
        alert("Blog Deleted!");
        loadPosts();
      } else {
        alert("Error deleting blog.");
      }
    })
    .catch(err => alert("Error deleting blog."));
}

// Show Edit Form
function showEditForm(id) {
  document.getElementById(`edit-form-${id}`).style.display = "block";
}

// Edit a Post (Update)
function editPost(id) {
  const newTitle = document.getElementById(`edit-title-${id}`).value;
  const newBody = document.getElementById(`edit-body-${id}`).value;
  const newAuthor = document.getElementById(`edit-author-${id}`).value;
  
  fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: newTitle,
      body: newBody,
      author: newAuthor || "Anonymous"
    }),
  })
    .then(res => {
      if (res.ok) {
        alert("Blog Updated!");
        loadPosts();
      } else {
        alert("Error updating blog.");
      }
    })
    .catch(err => alert("Error updating blog."));
}

function searchById() {
  const id = $("searchId").value.trim();
  if (!id) {
    alert("Enter a blog ID!");
    return;
  }
  
  fetch(`${API}/${id}`)
    .then(res => res.json())
    .then(post => {
      if (post.error) {
        $("posts").innerHTML = "<p>Blog not found</p>";
      } else {
        $("posts").innerHTML = `
          <div class="post">
            <h3>${post.title}</h3>
            <p>${post.body}</p>
            <small>Author: ${post.author}</small>
            <button onclick="deletePost('${post._id}')">Delete</button>
            <button onclick="showEditForm('${post._id}')">Edit</button>
          </div>
        `;
      }
    })
    .catch(err => console.error("Error searching post:", err));
}

loadPosts();

window.loadPosts = loadPosts;
window.searchById = searchById;
window.deletePost = deletePost;
window.showEditForm = showEditForm;
window.editPost = editPost;
