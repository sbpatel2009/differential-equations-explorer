library(shiny)
library(deSolve)
library(plotly)

ui <- fluidPage(
  titlePanel("Differential Equations Explorer"),
  sidebarLayout(
    sidebarPanel(
      textAreaInput("equations", "Enter system of ODEs (comma-separated, e.g., dx = x-y, dy = x+y):", 
                    value = "dx = x-y, dy = x+y", rows = 2),
      textInput("init", "Initial conditions (comma-separated, e.g., x=1, y=0):", value = "x=1, y=0"),
      numericInput("tstart", "Start time", 0),
      numericInput("tend", "End time", 10),
      numericInput("steps", "Number of steps", 300, min = 10),
      actionButton("solve", "Solve & Plot")
    ),
    mainPanel(
      plotlyOutput("timeseries"),
      plotlyOutput("phaseportrait"),
      verbatimTextOutput("error")
    )
  )
)

server <- function(input, output, session) {
  values <- reactiveValues(error = NULL)
  
  observeEvent(input$solve, {
    values$error <- NULL
    
    # Parse equations
    eqs <- unlist(strsplit(input$equations, ","))
    vars <- gsub("=.*$", "", eqs)
    rhs <- gsub("^.*=", "", eqs)
    vars <- trimws(gsub("^d", "", vars))
    eq_list <- setNames(rhs, vars)
    
    # Parse initial conditions
    inits <- unlist(strsplit(input$init, ","))
    ic <- sapply(strsplit(inits, "="), function(x) setNames(as.numeric(trimws(x[2])), trimws(x[1])))
    yinit <- unlist(ic)
    
    # Define ODE function
    ode_func <- function(t, y, parms) {
      env <- list2env(c(as.list(y), t = t))
      dydt <- setNames(numeric(length(vars)), vars)
      for (v in vars) {
        # Try to eval each ODE rhs as R code in the y/t environment
        res <- try(eval(parse(text = eq_list[v]), env), silent=TRUE)
        if (inherits(res, "try-error")) { values$error <- paste("Error parsing equation for", v); return(list(rep(NA,length(vars)))) }
        dydt[v] <- res
      }
      list(dydt)
    }
    
    times <- seq(input$tstart, input$tend, length.out = input$steps)
    result <- try(ode(yinit, times, ode_func, parms = NULL), silent = TRUE)
    
    if (inherits(result, "try-error")) {
      values$error <- "Error solving ODEs. Check your input equations and initial conditions."
      output$timeseries <- renderPlotly(NULL)
      output$phaseportrait <- renderPlotly(NULL)
      return()
    }
    
    result_df <- as.data.frame(result)
    
    # Time series plot
    ts_plot <- plot_ly(result_df, x = ~time)
    for (v in vars) {
      ts_plot <- add_lines(ts_plot, y = result_df[[v]], name = v)
    }
    ts_plot <- ts_plot %>% layout(title = "Numerical Solution", xaxis = list(title = "Time"), yaxis = list(title = "Value"))
    output$timeseries <- renderPlotly(ts_plot)
    
    # Phase portrait (only for at least 2 variables)
    if (length(vars) >= 2) {
      phase_plot <- plot_ly(result_df, x = result_df[[vars[1]]], y = result_df[[vars[2]]], type = "scatter", mode = "lines", name = "Trajectory")
      phase_plot <- phase_plot %>% layout(title = "Phase Portrait", xaxis = list(title = vars[1]), yaxis = list(title = vars[2]))
      output$phaseportrait <- renderPlotly(phase_plot)
    } else {
      output$phaseportrait <- renderPlotly(NULL)
    }
  })
  
  output$error <- renderText(values$error)
}

shinyApp(ui, server)
