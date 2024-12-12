const {
  client,
  createTables,
  createUser,
  loginUser,
  createItem,
  createReview,
  createComment,
  fetchItems,
  fetchReviewsForItem,
  fetchReviewsAndAverageScore,
  fetchUserReviews,
  fetchUserComments,
  updateReview,
  updateComment,
  deleteReview,
  deleteComment,
  fetchCommentsForReview,
} = require("./db");

const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

app.use(express.json());
app.use(require("morgan")("dev"));

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// Routes

// Register a user
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    res.status(201).send(await createUser({ username, email, password }));
  } catch (err) {
    next(err);
  }
});

// Login a user
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser({ email, password });
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).send({ token, user });
  } catch (err) {
    next(err);
  }
});

// Get current user details
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.send(req.user);
});

// Get all items
app.get("/api/items", async (req, res, next) => {
  try {
    res.send(await fetchItems());
  } catch (err) {
    next(err);
  }
});

// Get item details including reviews and average score
app.get("/api/items/:itemId", async (req, res, next) => {
  try {
    res.send(await fetchReviewsAndAverageScore(req.params.itemId));
  } catch (err) {
    next(err);
  }
});

// Create a review
app.post(
  "/api/items/:itemId/reviews",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { score, text } = req.body;
      res.status(201).send(
        await createReview({
          user_id: req.user.id,
          item_id: req.params.itemId,
          score,
          text,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

// Get reviews written by the logged-in user
app.get("/api/reviews/me", authenticateToken, async (req, res, next) => {
  try {
    res.send(await fetchUserReviews(req.user.id));
  } catch (err) {
    next(err);
  }
});

// Update a review
app.put(
  "/api/users/:userId/reviews/:reviewId",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { text, score } = req.body;
      if (req.user.id !== req.params.userId) {
        return res
          .status(403)
          .send({ error: "Unauthorized to update this review" });
      }
      res.send(
        await updateReview({
          reviewId: req.params.reviewId,
          userId: req.user.id,
          text,
          score,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

// Delete a review
app.delete(
  "/api/users/:userId/reviews/:reviewId",
  authenticateToken,
  async (req, res, next) => {
    try {
      if (req.user.id !== req.params.userId) {
        return res
          .status(403)
          .send({ error: "Unauthorized to delete this review" });
      }
      await deleteReview({
        reviewId: req.params.reviewId,
        userId: req.user.id,
      });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

// Add a comment to a review
app.post(
  "/api/items/:itemId/reviews/:reviewId/comments",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { text } = req.body;
      res.status(201).send(
        await createComment({
          user_id: req.user.id,
          review_id: req.params.reviewId,
          text,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

// Get comments written by the logged-in user
app.get("/api/comments/me", authenticateToken, async (req, res, next) => {
  try {
    res.send(await fetchUserComments(req.user.id));
  } catch (err) {
    next(err);
  }
});

// Update a comment
app.put(
  "/api/users/:userId/comments/:commentId",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { text } = req.body;
      if (req.user.id !== req.params.userId) {
        return res
          .status(403)
          .send({ error: "Unauthorized to update this comment" });
      }
      res.send(
        await updateComment({
          commentId: req.params.commentId,
          userId: req.user.id,
          text,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

// Delete a comment
app.delete(
  "/api/users/:userId/comments/:commentId",
  authenticateToken,
  async (req, res, next) => {
    try {
      if (req.user.id !== req.params.userId) {
        return res
          .status(403)
          .send({ error: "Unauthorized to delete this comment" });
      }
      await deleteComment({
        commentId: req.params.commentId,
        userId: req.user.id,
      });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ error: "Internal Server Error" });
});

// Dummy data to seed
const seedData = async () => {
  try {
    // Users
    const users = await Promise.all([
      createUser({
        username: "john_doe",
        email: "john@example.com",
        password: "password1",
      }),
      createUser({
        username: "jane_doe",
        email: "jane@example.com",
        password: "password2",
      }),
      createUser({
        username: "jim_bean",
        email: "jim@example.com",
        password: "password3",
      }),
      createUser({
        username: "susan_storm",
        email: "susan@example.com",
        password: "password4",
      }),
      createUser({
        username: "peter_parker",
        email: "peter@example.com",
        password: "password5",
      }),
    ]);

    console.log("Users seeded:", users);

    // Items (Cars)
    const cars = await Promise.all([
      createItem({
        name: "Toyota Camry",
        description: "A reliable and fuel-efficient sedan.",
      }),
      createItem({
        name: "Honda Civic",
        description: "Compact car with great mileage and durability.",
      }),
      createItem({
        name: "Ford Mustang",
        description: "A classic American muscle car.",
      }),
      createItem({
        name: "Chevrolet Malibu",
        description: "A midsize sedan with a comfortable ride.",
      }),
      createItem({
        name: "Tesla Model 3",
        description: "An all-electric sedan with cutting-edge technology.",
      }),
    ]);

    console.log("Items (cars) seeded:", cars);

    // Reviews (Generic)
    const reviews = await Promise.all([
      createReview({
        user_id: users[0].id,
        item_id: items[0].id,
        score: 5,
        text: "Excellent car!",
      }),
      createReview({
        user_id: users[1].id,
        item_id: items[1].id,
        score: 4,
        text: "Good value for money.",
      }),
    ]);

    console.log("Reviews seeded:", reviews);

    // Comments (Generic for testing)
    const comments = await Promise.all([
      createComment({
        user_id: users[1].id,
        review_id: reviews[0].id,
        text: "I agree, it's amazing!",
      }),
      createComment({
        user_id: users[0].id,
        review_id: reviews[1].id,
        text: "Thanks for sharing!",
      }),
    ]);

    console.log("Comments seeded:", comments);
  } catch (error) {
    console.error("Error seeding data:", error.message);
  }
};

// Initialize the server
const init = async () => {
  try {
    await client.connect();
    console.log("Connected to database");

    await createTables();
    console.log("Tables created");

    await seedData();
    console.log("Data seeded");

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Listening on port ${port}`));
  } catch (err) {
    console.error("Error initializing server", err);
  }
};

module.exports = app;

init();
