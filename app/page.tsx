"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import html2canvas from "html2canvas";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function Home() {
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [goal, setGoal] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [isVisualizationsVisible, setIsVisualizationsVisible] = useState(true);
  const [sortBy, setSortBy] = useState("sales");
  const [sortOrder, setSortOrder] = useState("desc");
  const [errors, setErrors] = useState({ date: "", goal: "", message: "" });
  const [salesData, setSalesData] = useState([]);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  useEffect(() => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${today.getFullYear()}`;
    setDate(formattedDate);
  }, []);

  const validateInputs = () => {
    const newErrors = { date: "", goal: "", message: "" };
    let isValid = true;

    if (!date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      newErrors.date = "Please enter a valid date (DD/MM/YYYY)";
      isValid = false;
    }
    if (!goal || isNaN(parseFloat(goal)) || parseFloat(goal) <= 0) {
      newErrors.goal = "Please enter a valid goal amount";
      isValid = false;
    }
    if (!message.trim()) {
      newErrors.message = "Please enter a sales message";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const processMessage = () => {
    if (!validateInputs()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const lines = message
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
      let totalSales = 0;
      let gemTotal = 0;
      const salesDataArray = [];
      let currentSalesperson = null;

      const salesLineRegex = /^([A-Za-z\s.]+)\s*-\s*(\d+\.?\d*)\s*(.*)$/;
      const gemLineRegex = /^💎\d+[A-Z]*(?:💎\d+[A-Z]*)*$/;
      const gemRegex = /💎(\d+)[A-Z]*/g;

      lines.forEach((line) => {
        if (salesLineRegex.test(line)) {
          const [, name, sales, rest] = line.match(salesLineRegex);
          const salesAmount = parseFloat(sales);
          totalSales += salesAmount;
          const gemMatches = [...rest.matchAll(gemRegex)];
          const gems = gemMatches.map((m) => parseInt(m[1], 10));
          const lineGemTotal = gems.reduce((sum, val) => sum + val, 0);
          currentSalesperson = {
            name,
            sales: salesAmount,
            gems,
            gemTotal: lineGemTotal,
          };
          salesDataArray.push(currentSalesperson);
          gemTotal += lineGemTotal;
        } else if (gemLineRegex.test(line) && currentSalesperson) {
          const gemMatches = [...line.matchAll(gemRegex)];
          const newGems = gemMatches.map((m) => parseInt(m[1], 10));
          currentSalesperson.gems = [...currentSalesperson.gems, ...newGems];
          const additionalGemTotal = newGems.reduce((sum, val) => sum + val, 0);
          currentSalesperson.gemTotal += additionalGemTotal;
          gemTotal += additionalGemTotal;
        }
      });

      const gemSales = (gemTotal * 12) / 1000;
      const otSales = totalSales - gemSales;
      const isGoalMet = totalSales >= parseFloat(goal);

      const formattedOutput = `**${date}**\n\n*GOAL - ${goal} (11.5 X 13)*\nTotal - ${totalSales.toFixed(
        2
      )}${isGoalMet ? "✅" : ""}\nOT - ${otSales.toFixed(
        2
      )}\nGEM - ${gemSales.toFixed(2)}`;
      setOutput(formattedOutput);
      setSalesData(
        salesDataArray.sort((a, b) =>
          sortOrder === "desc" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]
        )
      );
      setIsLoading(false);
      toast.success("Summary generated successfully!");
    }, 500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processMessage();
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard
        .writeText(output)
        .then(() => toast.success("Output copied to clipboard!"))
        .catch(() => toast.error("Failed to copy to clipboard"));
    }
  };

  const handleCopyTable = () => {
    const tableText = salesData
      .map(
        (item) =>
          `${item.name}\t${item.sales.toFixed(2)}\t${
            item.gems.join(", ") || "None"
          }\t${item.gemTotal}`
      )
      .join("\n");
    navigator.clipboard
      .writeText(tableText)
      .then(() => toast.success("Table copied to clipboard!"))
      .catch(() => toast.error("Failed to copy table"));
  };

  const handleClear = () => {
    setMessage("");
    setGoal("");
    setOutput("");
    setSalesData([]);
    setErrors({ date: "", goal: "", message: "" });
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${today.getFullYear()}`;
    setDate(formattedDate);
    toast.info("Form cleared!");
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e) => {
    const [year, month, day] = e.target.value.split("-");
    setDate(`${day}/${month}/${year}`);
  };

  const handleSort = (field) => {
    const newSortOrder =
      sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(field);
    setSortOrder(newSortOrder);
    setSalesData(
      [...salesData].sort((a, b) =>
        newSortOrder === "desc" ? b[field] - a[field] : a[field] - b[field]
      )
    );
  };

  const handleExportChart = (chartRef, chartName) => {
    if (chartRef.current) {
      html2canvas(chartRef.current.canvas).then((canvas) => {
        const link = document.createElement("a");
        link.download = `${chartName}-${date}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success(`${chartName} exported as PNG!`);
      });
    }
  };

  const barChartData = {
    labels: salesData.map((item) => item.name),
    datasets: [
      {
        label: "Sales Amount",
        data: salesData.map((item) => item.sales),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: ["Total", "OT", "GEM"],
    datasets: [
      {
        data: [
          parseFloat(output.match(/Total - (\d+\.\d+)/)?.[1] || "0"),
          parseFloat(output.match(/OT - (\d+\.\d+)/)?.[1] || "0"),
          parseFloat(output.match(/GEM - (\d+\.\d+)/)?.[1] || "0"),
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Sales Summary Generator
        </h1>
        <form onSubmit={handleSubmit}>
          <motion.div className="mb-4" whileHover={{ scale: 1.02 }}>
            <label className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={formatDateForInput(date)}
              onChange={handleDateChange}
              className="mt-1 p-2 w-full border rounded-md text-gray-600"
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </motion.div>
          <motion.div className="mb-4" whileHover={{ scale: 1.02 }}>
            <label className="block text-sm font-medium text-gray-700">
              Goal Amount
            </label>
            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md text-gray-600"
              placeholder="e.g., 150"
            />
            {errors.goal && (
              <p className="text-red-500 text-sm mt-1">{errors.goal}</p>
            )}
          </motion.div>
          <motion.div className="mb-4" whileHover={{ scale: 1.02 }}>
            <label className="block text-sm font-medium text-gray-700">
              Sales Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md h-40 text-gray-600"
              placeholder="Paste the sales message here"
            />
            {errors.message && (
              <p className="text-red-500 text-sm mt-1">{errors.message}</p>
            )}
          </motion.div>
          <div className="flex space-x-4">
            <motion.button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? "Processing..." : "Generate Summary"}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleClear}
              className="btn btn-secondary w-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear Form
            </motion.button>
          </div>
        </form>
        <AnimatePresence>
          {output && (
            <motion.div
              className="output-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Output</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setIsVisualizationsVisible(!isVisualizationsVisible)
                    }
                    className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 text-sm"
                  >
                    {isVisualizationsVisible
                      ? "Hide Visualizations"
                      : "Show Visualizations"}
                  </button>
                  <button
                    onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                    className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 text-sm"
                  >
                    {isOutputCollapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>
              {!isOutputCollapsed && (
                <>
                  <div>
                    <motion.pre
                      className="whitespace-pre-wrap text-gray-700 bg-gray-100 p-4 rounded-lg mb-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {output}
                    </motion.pre>
                    <motion.button
                      onClick={handleCopy}
                      className="btn btn-secondary w-full mb-4"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Copy Output
                    </motion.button>
                  </div>
                  {isVisualizationsVisible && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Sales by Person
                        </h3>
                        <button
                          onClick={() =>
                            handleExportChart(barChartRef, "Sales-Bar-Chart")
                          }
                          className="btn btn-accent text-sm"
                        >
                          Export Bar Chart
                        </button>
                      </div>
                      <div className="chart-container">
                        <Bar
                          ref={barChartRef}
                          data={barChartData}
                          options={{
                            responsive: true,
                            plugins: { legend: { position: "top" } },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: { display: true, text: "Sales Amount" },
                              },
                              x: { title: { display: true, text: "Salesperson" } },
                            },
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Metrics Breakdown
                        </h3>
                        <button
                          onClick={() =>
                            handleExportChart(pieChartRef, "Metrics-Pie-Chart")
                          }
                          className="btn btn-accent text-sm"
                        >
                          Export Pie Chart
                        </button>
                      </div>
                      <div className="chart-container">
                        <Pie
                          ref={pieChartRef}
                          data={pieChartData}
                          options={{
                            responsive: true,
                            plugins: { legend: { position: "top" } },
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Sales Details
                      </h3>
                      <div className="mb-4 flex justify-end space-x-2">
                        <button
                          onClick={() => handleSort("sales")}
                          className={`btn ${
                            sortBy === "sales" ? "btn-primary" : "btn-secondary"
                          } text-sm`}
                        >
                          Sort by Sales{" "}
                          {sortBy === "sales" && (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                        <button
                          onClick={() => handleSort("gemTotal")}
                          className={`btn ${
                            sortBy === "gemTotal" ? "btn-primary" : "btn-secondary"
                          } text-sm`}
                        >
                          Sort by Gems{" "}
                          {sortBy === "gemTotal" &&
                            (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                      </div>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Sales</th>
                              <th>Gem Amounts</th>
                              <th>Total Gems</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesData.map((item, index) => (
                              <tr key={index}>
                                <td>{item.name}</td>
                                <td>{item.sales.toFixed(2)}</td>
                                <td>{item.gems.join(", ") || "None"}</td>
                                <td>{item.gemTotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <motion.button
                        onClick={handleCopyTable}
                        className="btn btn-secondary w-full mt-4"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Copy Table
                      </motion.button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}