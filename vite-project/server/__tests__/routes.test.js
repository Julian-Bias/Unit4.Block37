const request = require("supertest");
const app = require("../index");
const {
  client,
  createUser,
  createItem,
  createReview,
  createComment,
} = require("../db");

let token;
let user;
let item;
let review;
let comment;

beforeAll(async () => {
  if (!client._connected) {
    await client.connect();
  }

  // Seed data
  user = await createUser({
    username: "test_user",
    email: "test@example.com",
    password: "password123",
  });

  item = await createItem({
    name: "Test Item",
    description: "This is a test item.",
  });

  review = await createReview({
    user_id: user.id,
    item_id: item.id,
    score: 5,
    text: "Great item!",
  });

  comment = await createComment({
    user_id: user.id,
    review_id: review.id,
    text: "This is a test comment.",
  });

  // Get token by logging in
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "password123" });
  token = response.body.token;
});

afterAll(async () => {
  await client.end();
});

describe("API Routes", () => {
  it("should register a user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "new_user",
      email: "new@example.com",
      password: "password456",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("username", "new_user");
  });

  it("should log in a user", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
  });

  it("should fetch current user details", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", user.id);
    expect(response.body).toHaveProperty("username", user.username);
  });

  it("should fetch all items", async () => {
    const response = await request(app).get("/api/items");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty("id");
    expect(response.body[0]).toHaveProperty("name");
  });

  it("should fetch item details including reviews and average score", async () => {
    const response = await request(app).get(`/api/items/${item.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("reviews");
    expect(response.body).toHaveProperty("average_score");
  });

  it("should create a review", async () => {
    const reviewData = {
      score: 4,
      text: "Another great review!",
    };
    const response = await request(app)
      .post(`/api/items/${item.id}/reviews`)
      .set("Authorization", `Bearer ${token}`)
      .send(reviewData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("score", reviewData.score);
    expect(response.body).toHaveProperty("text", reviewData.text);
  });

  it("should fetch reviews written by the logged-in user", async () => {
    const response = await request(app)
      .get("/api/reviews/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty("id");
  });

  it("should update a review", async () => {
    const reviewData = {
      text: "Updated review text",
      score: 3,
    };
    const response = await request(app)
      .put(`/api/users/${user.id}/reviews/${review.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(reviewData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("text", reviewData.text);
    expect(response.body).toHaveProperty("score", reviewData.score);
  });

  it("should delete a review", async () => {
    const response = await request(app)
      .delete(`/api/users/${user.id}/reviews/${review.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
  });

  it("should add a comment to a review", async () => {
    const commentData = {
      text: "This is another test comment",
    };
    const response = await request(app)
      .post(`/api/items/${item.id}/reviews/${review.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send(commentData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("text", commentData.text);
  });

  it("should fetch comments written by the logged-in user", async () => {
    const response = await request(app)
      .get("/api/comments/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty("id");
  });

  it("should update a comment", async () => {
    const commentData = {
      text: "Updated comment text",
    };
    const response = await request(app)
      .put(`/api/users/${user.id}/comments/${comment.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(commentData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("text", commentData.text);
  });

  it("should delete a comment", async () => {
    const response = await request(app)
      .delete(`/api/users/${user.id}/comments/${comment.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
  });
});
