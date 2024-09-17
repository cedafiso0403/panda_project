

const {logger} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp, FieldValue} =
  require("firebase-admin/firestore");

initializeApp();

exports.createEvent = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: "failure",
        message: "Method Not Allowed",
        error: {
          code: 405,
          details: "Only POST requests are allowed",
        },
        timestamp: timeNow,

      });
    }

    // Destructure event data from the request body
    const {title, description, date, location, organizer, eventType} = req.body;

    if
    (!title || !description || !date || !location || !organizer || !eventType) {
      return res.status(400).json({
        status: "failure",
        message: "Missing required fields",
        error: {
          code: 400,
          details: "Please provide all required fields",
        },
        timestamp: timeNow,

      });
    }

    // Add the event to Firestore
    const result = await getFirestore().collection("events").add({
      title: title,
      description: description,
      date: Timestamp.fromDate(new Date(date)),
      location: location,
      organizer: organizer,
      eventType: eventType,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Respond with success and the document ID
    res.status(201).json({
      status: "success",
      data: {
        id: result.id,
        title,
        description,
        date,
        location,
        organizer,
        eventType,
      },
      timestamp: timeNow,
    });
  } catch (error) {
    // Log the error and respond with a failure message
    logger.warn("Error adding event: ", error);


    res.status(500)
        .json({
          status: "failure",
          message: "Error creating event",
          error: {
            code: 500,
            details: "Unable to create new event",
          },
          timestamp: timeNow,

        });
  }
});

exports.getAllEvents = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    const snapshot = await getFirestore().collection("events").get();
    const events = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    if (req.method !== "GET") {
      return res.status(405).json({
        status: "failure",
        message: "Method Not Allowed",
        error: {
          code: 405,
          details: "Only GET requests are allowed",
        },
        timestamp: timeNow,

      });
    }

    res.status(201).json({
      status: "success",
      data: {
        events,
      },
      timestamp: timeNow,
    });
  } catch (error) {
    // Log the error and respond with a failure message
    logger.warn("Error fetching events: ", error);


    res.status(500)
        .json({
          status: "failure",
          message: "Error fetching all event",
          error: {
            code: 500,
            details: "Unable to get all events",
          },
          timestamp: timeNow,

        });
  }
});

// Get Event by ID
exports.getEventById = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        status: "failure",
        message: "Method Not Allowed",
        error: {
          code: 405,
          details: "Only GET requests are allowed",
        },
        timestamp: timeNow,

      });
    }

    const {id} = req.query;
    const eventDoc = await getFirestore().collection("events").doc(id).get();

    res.status(200).json(
        {
          status: "success",
          data: !eventDoc.exists ? {} : {
            id: eventDoc.id,
            ...eventDoc.data(),
          },
          timestamp: timeNow,
        },
    );
  } catch (error) {
    // Log the error and respond with a failure message
    logger.warn("Error fetching event: ", error);
    res.status(500).send(
        {
          status: "failure",
          message: "Error fetching event",
          error: {
            code: 500,
            details: "Unable to get event",
          },
          timestamp: timeNow,
        },
    );
  }
});

// Update Event
exports.updateEvent = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    const {id} = req.query;
    const {title, description, date, location,
      organizer, eventType} = req.body;

    await getFirestore().collection("events").doc(id).update({
      title,
      description,
      date: Timestamp.fromDate(new Date(date)),
      location,
      organizer,
      eventType,
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).send({message: "Event updated"});
  } catch (error) {
    logger.warn("Error updating event: ", error);
    res.status(500).send(
        {
          status: "failure",
          message: "Error updating event",
          error: {
            code: 500,
            details: "Unable to update event",
          },
          timestamp: timeNow,
        },
    );
  }
});

// Delete Event
exports.deleteEvent = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    const {id} = req.query;

    await getFirestore().collection("events").doc(id).delete();

    res.status(200).json(
        {
          status: "success",
          data: {
            message: "Event deleted",
          },
          timestamp: timeNow,
        },
    );
  } catch (error) {
    logger.warn("Error deleting event: ", error);
    res.status(500).send(
        {
          status: "failure",
          message: "Error deleting event",
          error: {
            code: 500,
            details: "Unable to delete event",
          },
          timestamp: timeNow,
        },
    );
  }
});

// Filter Events by Event Type or Date
exports.filterEvents = onRequest(async (req, res) => {
  const timeNow = Timestamp.now().toMillis();

  try {
    const {eventType, date} = req.query;

    if (!eventType && !date) {
      return res.status(400).json({
        status: "failure",
        message: "Missing required fields",
        error: {
          code: 400,
          details: "Please provide at least one filter",
        },
        timestamp: timeNow,
      });
    }

    const dateFilter = Timestamp.fromDate(new Date(date));

    let eventsRef = getFirestore().collection("events");

    if (eventType) {
      eventsRef = eventsRef.where("eventType", "==", eventType);
    }
    if (date) {
      eventsRef = eventsRef.where("date", "==", dateFilter);
    }

    const snapshot = await eventsRef.get();

    const events = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    res.status(200).send(events);
  } catch (error) {
    logger.warn("Error filtering event: ", error);
    res.status(500).send(
        {
          status: "failure",
          message: "Error filtering event",
          error: {
            code: 500,
            details: "Unable to filter event",
          },
          timestamp: timeNow,
        },
    );
  }
});

exports.updateOnUpdate =
  onDocumentUpdated("/events/{eventId}", async (event) => {
    const firestore = getFirestore();
    const docRef = firestore.collection("events").doc(event.params.eventId);

    try {
      // Update the updated document with the `updatedAt` field
      await docRef.update({
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating `updatedAt` field on update: ", error);
    }
  });
