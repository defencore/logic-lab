# Route eight separate data lines

Select a byte, split and merge its bits, then route it to one output.

**Estimated time:** 25 minutes. **Level:** intermediate.

## Starting circuit

Open **Route eight separate data lines** in the Logic Lab Examples catalog, or download [circuit.json](./circuit.json) and import it into Logic Lab. The JSON file is the canonical starting circuit; [lesson.js](./lesson.js) contains the bilingual lesson and lab metadata. No physical hardware is required.

Keep the simulation running for timed observations; use Pause and Step when recording individual changes. Combinational circuits also update while paused.

## Objectives

- Follow a byte through selection, individual wires and routing.
- Verify the predicted behavior through controlled input changes.

## Procedure

1. **Select byte A.** Select B starts at 0. The multiplexer forwards Byte A=42. Read the MUX byte value and follow its eight separately labeled input and output lines.

2. **Follow the bit order.** The splitter sends b0 to b0, b1 to b1 and so on. The merger reconstructs the same byte. Every wire carries one bit, and matching bit numbers preserve its position in the byte.

3. **Switch the route.** Turn Select B on. Now 165 appears at Route 1 and Route 0 becomes 0. Turn it off to send 42 to Route 0. Read both bytes on the demultiplexer; the two scopes trace bit 0 of each route.

## Expected result

Selector 0 chooses A and route 0; selector 1 chooses B and route 1. Splitting and merging preserve the byte.

## Review questions

1. Why must splitter b0 connect to merger b0?
2. What is the inactive demultiplexer output?
3. Why must all eight bit lines be connected in the same numbered order?

## Deliverables

- An exported .logic.json project containing your completed experiment.
- A routing table for both selector states and one screenshot showing split/merged bit order.

## Extension

Change one parameter or connection, predict the result before running it, and record whether the observation matches the prediction. Keep the supplied starting JSON unchanged; export your modified circuit as a separate file.
