var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");



const { PrismaClient } = require("@prisma/client");
const passport = require("passport");
const expressSession = require("express-session");
const LocalStrategy = require("passport-local").Strategy;
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const bcrypt = require("bcryptjs");

var indexRouter = require("./routes/index");

var app = express();


const prisma = new PrismaClient();
const prismaSessionsStore = new PrismaSessionStore(
  prisma,
  {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }
)


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(expressSession({
  secret: 'passport',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // equal to 1 day
  store: prismaSessionsStore
}));
app.use(passport.session());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: username }
    });

    if (!user) {
      return done(null, false, { message: 'Incorrect username' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password' });
    }

    return done(null, user);

  } catch (error) {
    done(error);
  }
}))

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: id }
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});




app.use("/", indexRouter);






// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
