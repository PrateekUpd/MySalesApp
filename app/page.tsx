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
  const [sortBy, setSortBy] = useState("sales"); // Default sort by sales
  const [sortOrder, setSortOrder] = useState("desc"); // Default descending
  const [errors, setErrors] = useState({ date: "", goal: "", message: "" });
  const [salesData, setSalesData] = useState([]);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  // Set default date to today (formatted as DD/MM/YYYY)
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
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // Split message into lines
      const lines = message.split('\n').map(line => line.trim()).filter(line => line);

      // Initialize variables
      let totalSales = 0;
      let gemTotal = 0;
      const salesDataArray = [];
      let currentSalesperson = null;

      // Regex definitions
      const salesLineRegex = /^([A-Za-z\s.]+)\s*-\s*(\d+\.?\d*)\s*(.*)$/;
      const gemLineRegex = /^💎\d+[A-Z]*(?:💎\d+[A-Z]*)*$/; // Matches lines with only gems
      const gemRegex = /💎(\d+)[A-Z]*/g;

      // Process each line
      lines.forEach(line => {
        if (salesLineRegex.test(line)) {
          const [, name, sales, rest] = line.match(salesLineRegex);
          const salesAmount = parseFloat(sales);
          totalSales += salesAmount;
          // Extract gems from salesperson line
          const gemMatches = [...rest.matchAll(gemRegex)];
          const gems = gemMatches.map(m => parseInt(m[1], 10));
          const lineGemTotal = gems.reduce((sum, val) => sum + val, 0);
          currentSalesperson = { name, sales: salesAmount, gems, gemTotal: lineGemTotal };
          salesDataArray.push(currentSalesperson);
          gemTotal += lineGemTotal; // Add to global gem total
        } else if (gemLineRegex.test(line) && currentSalesperson) {
          // Process standalone gem line
          const gemMatches = [...line.matchAll(gemRegex)];
          const newGems = gemMatches.map(m => parseInt(m[1], 10));
          currentSalesperson.gems = [...currentSalesperson.gems, ...newGems];
          const additionalGemTotal = newGems.reduce((sum, val) => sum + val, 0);
          currentSalesperson.gemTotal += additionalGemTotal;
          gemTotal += additionalGemTotal; // Ensure global gem total updates
        }
        // Ignore non-matching lines (e.g., ₹500, competition notes)
      });

      // Calculate GEM and OT
      const gemSales = (gemTotal * 12) / 1000;
      const otSales = totalSales - gemSales;
      const isGoalMet = totalSales >= parseFloat(goal);

      // Format output
      const formattedOutput = `**${date}**\n\n*GOAL - ${goal} (11.5 X 13)*\nTotal - ${totalSales.toFixed(2)}${isGoalMet ? '✅' : ''}\nOT - ${otSales.toFixed(2)}\nGEM - ${gemSales.toFixed(2)}`;
      setOutput(formattedOutput);
      setSalesData(salesDataArray.sort((a, b) => sortOrder === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]));
      setIsLoading(false);
      toast.success('Summary generated successfully!');
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split("-");
    setDate(`${day}/${month}/${year}`);
  };

  const handleSort = (field: string) => {
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

  const handleExportChart = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef: React.RefObject<any>,
    chartName: string
  ) => {
    if (chartRef.current) {
      html2canvas(chartRef.current.canvas)
        .then((canvas) => {
          const link = document.createElement("a");
          link.download = `${chartName}-${date}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          toast.success(`${chartName} exported as PNG!`);
        })
        .catch(() => toast.error(`Failed to export ${chartName}`));
    }
  };

  // Bar chart data
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

  // Pie chart data
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
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Sales Summary Generator
        </h1>
        <form onSubmit={handleSubmit}>
          <motion.div
            className="mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
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
          <motion.div
            className="mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
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
          <motion.div
            className="mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
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
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? "Processing..." : "Generate Summary"}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleClear}
              className="w-full bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
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
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-600">Output</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setIsVisualizationsVisible(!isVisualizationsVisible)
                    }
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    {isVisualizationsVisible
                      ? "Hide Visualizations"
                      : "Show Visualizations"}
                  </button>
                  <button
                    onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    {isOutputCollapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>
              {!isOutputCollapsed && (
                <>
                  <motion.pre
                    className="whitespace-pre-wrap text-gray-600 bg-gray-100 p-3 rounded-md mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {output}
                  </motion.pre>
                  {isVisualizationsVisible && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-md font-semibold text-gray-600 mb-2">
                        Sales by Person
                      </h3>
                      <div className="mb-6 relative">
                        <Bar
                          ref={barChartRef}
                          data={barChartData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: "top" },
                              tooltip: { enabled: true },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: { display: true, text: "Sales Amount" },
                              },
                              x: {
                                title: { display: true, text: "Salesperson" },
                              },
                            },
                          }}
                        />
                        <button
                          onClick={() =>
                            handleExportChart(barChartRef, "Sales-Bar-Chart")
                          }
                          className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded-md hover:bg-purple-600 text-sm"
                        >
                          Export Bar Chart
                        </button>
                      </div>
                      <h3 className="text-md font-semibold text-gray-600 mb-2">
                        Metrics Breakdown
                      </h3>
                      <div className="mb-6 relative">
                        <Pie
                          ref={pieChartRef}
                          data={pieChartData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: "top" },
                              tooltip: { enabled: true },
                            },
                          }}
                        />
                        <button
                          onClick={() =>
                            handleExportChart(pieChartRef, "Metrics-Pie-Chart")
                          }
                          className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded-md hover:bg-purple-600 text-sm"
                        >
                          Export Pie Chart
                        </button>
                      </div>
                      <h3 className="text-md font-semibold text-gray-600 mb-2">
                        Sales Details
                      </h3>
                      <div className="mb-4 flex justify-end space-x-2">
                        <button
                          onClick={() => handleSort("sales")}
                          className={`px-2 py-1 rounded-md ${
                            sortBy === "sales"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          Sort by Sales{" "}
                          {sortBy === "sales" &&
                            (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                        <button
                          onClick={() => handleSort("gemTotal")}
                          className={`px-2 py-1 rounded-md ${
                            sortBy === "gemTotal"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          Sort by Gems{" "}
                          {sortBy === "gemTotal" &&
                            (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-600 border-collapse">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 border">Name</th>
                              <th className="p-2 border">Sales</th>
                              <th className="p-2 border">Gem Amounts</th>
                              <th className="p-2 border">Total Gems</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesData.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-100">
                                <td className="p-2 border">{item.name}</td>
                                <td className="p-2 border">
                                  {item.sales.toFixed(2)}
                                </td>
                                <td className="p-2 border">
                                  {item.gems.join(", ") || "None"}
                                </td>
                                <td className="p-2 border">{item.gemTotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <motion.button
                onClick={handleCopy}
                className="mt-4 w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Copy to Clipboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
