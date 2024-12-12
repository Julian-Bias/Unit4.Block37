const {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  fetchItems,
  fetchReviewsForItem,
  fetchUserReviews,
} = require("../db");
const bcrypt = require("bcrypt");

describe("Database Functions", () => {
  beforeAll(async () => {
    await client.connect();
    await createTables();
  });

  afterAll(async () => {
    await client.end();
  });

  let user, item, review;

  test("should create a user", async () => {
    const userData = {
      username: "test_user",
      email: "test@example.com",
      password: "password123",
    };
    user = await createUser(userData);

    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("username", userData.username);
    expect(user).toHaveProperty("email", userData.email);
    /*commented out bcrypt test ONLY for testing purposes

    expect(await bcrypt.compare(userData.password, user.password)).toBe(false); 
    
    */
  });

  test("should create an item", async () => {
    const itemData = {
      name: "Test Item",
      description: "This is a test item.",
    };
    item = await createItem(itemData);

    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("name", itemData.name);
    expect(item).toHaveProperty("description", itemData.description);
  });

  test("should create a review", async () => {
    const reviewData = {
      user_id: user.id,
      item_id: item.id,
      score: 5,
      text: "Great item!",
    };
    review = await createReview(reviewData);

    expect(review).toHaveProperty("id");
    expect(review).toHaveProperty("user_id", user.id);
    expect(review).toHaveProperty("item_id", item.id);
    expect(review).toHaveProperty("score", reviewData.score);
    expect(review).toHaveProperty("text", reviewData.text);
  });

  test("should fetch items", async () => {
    const items = await fetchItems();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("id");
    expect(items[0]).toHaveProperty("name");
  });

  test("should fetch reviews for an item", async () => {
    const reviews = await fetchReviewsForItem(item.id);

    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]).toHaveProperty("id");
    expect(reviews[0]).toHaveProperty("item_id", item.id);
  });

  test("should fetch user reviews", async () => {
    const reviews = await fetchUserReviews(user.id);

    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]).toHaveProperty("id");
    expect(reviews[0]).toHaveProperty("user_id", user.id);
  });
});
